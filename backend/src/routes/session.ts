import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";

import { query } from "../config/database";
import { cacheSessionState, getCachedSessionState } from "../config/database";
import { signToken, requireAuth } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  StartSessionSchema,
  SubmitAnswerSchema,
  SessionIdParamSchema,
} from "../schemas";
import {
  getNextQuestion,
  AiServiceUnavailableError,
} from "../services/aiService";

export const sessionRouter = Router();

// ─────────────────────────────────────────────────────────────
// POST /api/session/start
// ─────────────────────────────────────────────────────────────
sessionRouter.post(
  "/start",
  validate(StartSessionSchema, "body"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { concern_branch } = req.body;

      // 1. Generate an anonymous hashed token (no PII)
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

      // 2. Upsert student row (idempotent via hashed_token unique constraint)
      const studentResult = await query<{ id: string }>(
        `INSERT INTO students (hashed_token)
         VALUES ($1)
         ON CONFLICT (hashed_token) DO UPDATE SET hashed_token = EXCLUDED.hashed_token
         RETURNING id`,
        [hashedToken]
      );
      const studentId = studentResult.rows[0].id;

      // 3. Create feedback session
      const sessionResult = await query<{ id: string }>(
        `INSERT INTO feedback_sessions (student_id, concern_branch)
         VALUES ($1, $2)
         RETURNING id`,
        [studentId, concern_branch]
      );
      const sessionId = sessionResult.rows[0].id;

      // 4. Fetch the first question for this branch (order = 1)
      const questionResult = await query<{
        id: string;
        text: string;
        type: string;
      }>(
        `SELECT id, text, type FROM questions
         WHERE branch = $1
         ORDER BY "order" ASC
         LIMIT 1`,
        [concern_branch]
      );

      const firstQuestion = questionResult.rows[0] || null;

      // 5. Sign a JWT — contains only session_id and role, zero PII
      const token = signToken({
        session_id: sessionId,
        role: "anonymous",
      });

      // 6. Seed the session cache in Redis
      await cacheSessionState(sessionId, {
        concern_branch,
        answered_ids: [],
        question_count: 0,
      });

      res.status(201).json({
        success: true,
        session_id: sessionId,
        token,
        first_question: firstQuestion
          ? {
              question_id: firstQuestion.id,
              text: firstQuestion.text,
              type: firstQuestion.type,
            }
          : null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET /api/session/:session_id/next-question
// ─────────────────────────────────────────────────────────────
sessionRouter.get(
  "/:session_id/next-question",
  requireAuth,
  validate(SessionIdParamSchema, "params"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = req.params.session_id as string;

      // 1. Get session info
      const sessionResult = await query<{
        concern_branch: string;
        completed: boolean;
      }>(
        `SELECT concern_branch, completed FROM feedback_sessions WHERE id = $1`,
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: { message: "Session not found" },
        });
        return;
      }

      const session = sessionResult.rows[0];
      if (session.completed) {
        res.json({ success: true, done: true });
        return;
      }

      // 2. Fetch all answered questions with their answers from DB
      const answeredResult = await query<{
        question_id: string;
        answer: string;
      }>(
        `SELECT question_id, answer FROM responses WHERE session_id = $1`,
        [sessionId]
      );
      const answersSoFar = answeredResult.rows.map((r) => ({
        question_id: r.question_id,
        answer: r.answer,
      }));
      const answeredIds = answersSoFar.map((a) => a.question_id);

      // 3. Try the AI service for adaptive question selection
      try {
        const aiResponse = await getNextQuestion(
          sessionId,
          session.concern_branch,
          answersSoFar
        );

        if (aiResponse.done) {
          await query(
            `UPDATE feedback_sessions SET completed = TRUE WHERE id = $1`,
            [sessionId]
          );
          res.json({ success: true, done: true });
          return;
        }

        res.json({
          success: true,
          done: false,
          question_id: aiResponse.next_question_id,
        });
        return;
      } catch (err) {
        if (!(err instanceof AiServiceUnavailableError)) throw err;
        // Fall through to DB-based fallback
      }

      // 4. Fallback: sequential question from DB
      const nextQuestion = await query<{
        id: string;
        text: string;
        type: string;
      }>(
        `SELECT id, text, type FROM questions
         WHERE branch = $1
           AND id NOT IN (SELECT unnest($2::text[]))
         ORDER BY "order" ASC
         LIMIT 1`,
        [session.concern_branch, answeredIds]
      );

      if (nextQuestion.rows.length === 0) {
        await query(
          `UPDATE feedback_sessions SET completed = TRUE WHERE id = $1`,
          [sessionId]
        );
        res.json({ success: true, done: true });
        return;
      }

      const q = nextQuestion.rows[0];
      res.json({
        success: true,
        done: false,
        question_id: q.id,
        text: q.text,
        type: q.type,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// POST /api/session/:session_id/answer
// ─────────────────────────────────────────────────────────────
sessionRouter.post(
  "/:session_id/answer",
  requireAuth,
  validate(SessionIdParamSchema, "params"),
  validate(SubmitAnswerSchema, "body"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sessionId = req.params.session_id as string;
      const { question_id, answer } = req.body;

      // 1. Verify session exists and is not completed
      const sessionCheck = await query<{ id: string; completed: boolean }>(
        `SELECT id, completed FROM feedback_sessions WHERE id = $1`,
        [sessionId]
      );

      if (sessionCheck.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: { message: "Session not found" },
        });
        return;
      }

      if (sessionCheck.rows[0].completed) {
        res.status(409).json({
          success: false,
          error: { message: "Session is already completed" },
        });
        return;
      }

      // 2. Verify question exists
      const questionCheck = await query<{ id: string }>(
        `SELECT id FROM questions WHERE id = $1`,
        [question_id]
      );

      if (questionCheck.rows.length === 0) {
        res.status(400).json({
          success: false,
          error: { message: `Question '${question_id}' does not exist` },
        });
        return;
      }

      // 3. Store response in PostgreSQL (unique constraint prevents duplicates)
      await query(
        `INSERT INTO responses (session_id, question_id, answer)
         VALUES ($1, $2, $3)
         ON CONFLICT (session_id, question_id)
         DO UPDATE SET answer = EXCLUDED.answer, answered_at = NOW()`,
        [sessionId, question_id, answer]
      );

      // 4. Update session state in Redis (TTL 2 hours)
      const cached = await getCachedSessionState(sessionId);
      const answeredIds = cached
        ? [...new Set([...(cached.answered_ids as string[]), question_id])]
        : [question_id];

      await cacheSessionState(sessionId, {
        ...(cached || {}),
        answered_ids: answeredIds,
        question_count: answeredIds.length,
        last_answered_at: new Date().toISOString(),
      });

      res.json({ success: true, saved: true });
    } catch (err) {
      next(err);
    }
  }
);
