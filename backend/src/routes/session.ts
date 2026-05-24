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
  getNextQuestion as getAINextQuestion,
  AiServiceUnavailableError,
} from "../services/aiService";
import {
  getNextQuestion as engineGetNextQuestion,
  shouldEndSession,
} from "../engines/questionEngine";
import { QUESTION_FLOW } from "../data/questionFlow";

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
      //    TASK 3: Initialize additional tracking keys
      await cacheSessionState(sessionId, {
        concern_branch,
        answered_ids: [],
        question_count: 0,
        answeredIds: JSON.stringify([]),
        answerRatings: JSON.stringify({}),
        lastQuestionType: "",
        questionCount: "0",
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
      console.error("[session.start] error:", err);
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// GET /api/session/:session_id/next-question
// TASK 4: Use questionEngine for multi-step flow
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
        res.json({ success: true, done: true, questionCount: 999 });
        return;
      }

      // 2. Read session state from Redis
      const cached = await getCachedSessionState(sessionId);
      const answeredIds: string[] = cached?.answeredIds
        ? JSON.parse(cached.answeredIds as string)
        : [];
      const questionCount = answeredIds.length;
      const lastQuestionType = (cached?.lastQuestionType as string) || "";

      // 3. If this is the first question (count = 0), use ML-predicted first question
      //    (existing logic — unchanged)
      if (questionCount === 0) {
        // Fetch all answered questions with their answers from DB
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
        const dbAnsweredIds = answersSoFar.map((a) => a.question_id);

        // Try the AI service for the first question
        try {
          const aiResponse = await getAINextQuestion(
            sessionId,
            session.concern_branch,
            answersSoFar
          );

          if (aiResponse.done) {
            // AI says done but we haven't even started — this shouldn't happen
            // but respect it only if we have enough questions
            if (dbAnsweredIds.length >= 5) {
              await query(
                `UPDATE feedback_sessions SET completed = TRUE WHERE id = $1`,
                [sessionId]
              );
              res.json({ success: true, done: true, questionCount: dbAnsweredIds.length });
              return;
            }
            // Otherwise fall through to engine
          } else if (aiResponse.next_question_id) {
            // Return the AI-predicted first question
            const questionObj = QUESTION_FLOW[aiResponse.next_question_id];
            if (questionObj) {
              res.json({
                success: true,
                done: false,
                question_id: questionObj.id,
                text: questionObj.text,
                type: questionObj.type,
                options: questionObj.options,
                questionCount,
              });
              return;
            }
          }
        } catch (err) {
          if (!(err instanceof AiServiceUnavailableError)) throw err;
          // Fall through to DB-based fallback
        }

        // Fallback: sequential first question from DB
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
          [session.concern_branch, dbAnsweredIds]
        );

        if (nextQuestion.rows.length === 0) {
          // No questions at all in DB — try the question flow config
          const flowFirstId = `${session.concern_branch}_rating_01`;
          const flowFirst = QUESTION_FLOW[flowFirstId];
          if (flowFirst) {
            res.json({
              success: true,
              done: false,
              question_id: flowFirst.id,
              text: flowFirst.text,
              type: flowFirst.type,
              options: flowFirst.options,
              questionCount: 0,
            });
            return;
          }
          res.json({ success: true, done: true, questionCount: 0 });
          return;
        }

        const q = nextQuestion.rows[0];
        res.json({
          success: true,
          done: false,
          question_id: q.id,
          text: q.text,
          type: q.type,
          questionCount: 0,
        });
        return;
      }

      // 4. For subsequent questions (count > 0): use questionEngine
      //    Check shouldEndSession first
      if (shouldEndSession(answeredIds, session.concern_branch)) {
        await query(
          `UPDATE feedback_sessions SET completed = TRUE WHERE id = $1`,
          [sessionId]
        );
        res.json({ success: true, done: true, questionCount });
        return;
      }

      // Get the last answered question to determine the next one
      const lastAnsweredId = answeredIds[answeredIds.length - 1];
      const answerRatings: Record<string, string | number> = cached?.answerRatings
        ? JSON.parse(cached.answerRatings as string)
        : {};
      const lastAnswer = answerRatings[lastAnsweredId] ?? "";

      const nextQuestionId = engineGetNextQuestion(
        lastAnsweredId,
        lastAnswer,
        answeredIds,
        session.concern_branch
      );

      if (!nextQuestionId) {
        // No more questions available
        if (answeredIds.length >= 5) {
          await query(
            `UPDATE feedback_sessions SET completed = TRUE WHERE id = $1`,
            [sessionId]
          );
          res.json({ success: true, done: true, questionCount });
          return;
        }
        // Under minimum but no questions left — end anyway
        await query(
          `UPDATE feedback_sessions SET completed = TRUE WHERE id = $1`,
          [sessionId]
        );
        res.json({ success: true, done: true, questionCount });
        return;
      }

      // Look up the full question object from QUESTION_FLOW
      const questionObj = QUESTION_FLOW[nextQuestionId];
      if (!questionObj) {
        // Question ID from engine doesn't exist in flow — shouldn't happen
        console.error(`[session.next-question] Question ${nextQuestionId} not found in QUESTION_FLOW`);
        res.json({ success: true, done: true, questionCount });
        return;
      }

      res.json({
        success: true,
        done: false,
        question_id: questionObj.id,
        text: questionObj.text,
        type: questionObj.type,
        options: questionObj.options,
        questionCount,
      });
    } catch (err) {
      console.error("[session.next-question] error:", err);
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// POST /api/session/:session_id/answer
// TASK 3: Update Redis session state with question tracking
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
      const sessionCheck = await query<{ id: string; completed: boolean; concern_branch: string }>(
        `SELECT id, completed, concern_branch FROM feedback_sessions WHERE id = $1`,
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

      const branch = sessionCheck.rows[0].concern_branch;

      // 2. Verify question exists (check both DB and QUESTION_FLOW)
      const questionCheck = await query<{ id: string }>(
        `SELECT id FROM questions WHERE id = $1`,
        [question_id]
      );

      const existsInFlow = !!QUESTION_FLOW[question_id];

      if (questionCheck.rows.length === 0 && !existsInFlow) {
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
      //    TASK 3: Track question history, answer ratings, and types
      const cached = await getCachedSessionState(sessionId);

      // Parse existing tracking data
      const answeredIds: string[] = cached?.answeredIds
        ? JSON.parse(cached.answeredIds as string)
        : [];
      const answerRatings: Record<string, string | number> = cached?.answerRatings
        ? JSON.parse(cached.answerRatings as string)
        : {};

      // Push the new question ID (avoid duplicates)
      if (!answeredIds.includes(question_id)) {
        answeredIds.push(question_id);
      }

      // Save the answer into answerRatings
      answerRatings[question_id] = answer;

      // Determine the question type
      const questionFlowItem = QUESTION_FLOW[question_id];
      const lastQuestionType = questionFlowItem?.type || "";

      // Compute next question using the engine
      const nextQuestionId = engineGetNextQuestion(
        question_id,
        answer,
        answeredIds,
        branch
      );

      // Check if session should end
      const done = shouldEndSession(answeredIds, branch) || nextQuestionId === null;

      // Build the next question response data
      let nextQuestionData: {
        question_id?: string;
        text?: string;
        type?: string;
        options?: string[];
      } = {};

      if (nextQuestionId && !done) {
        const nextQ = QUESTION_FLOW[nextQuestionId];
        if (nextQ) {
          nextQuestionData = {
            question_id: nextQ.id,
            text: nextQ.text,
            type: nextQ.type,
            options: nextQ.options,
          };
        }
      }

      // Mark session complete in DB if done
      if (done) {
        await query(
          `UPDATE feedback_sessions SET completed = TRUE WHERE id = $1`,
          [sessionId]
        );
      }

      // Save updated state to Redis
      await cacheSessionState(sessionId, {
        ...(cached || {}),
        concern_branch: branch,
        answered_ids: answeredIds,
        question_count: answeredIds.length,
        answeredIds: JSON.stringify(answeredIds),
        answerRatings: JSON.stringify(answerRatings),
        lastQuestionType,
        questionCount: String(answeredIds.length),
        last_answered_at: new Date().toISOString(),
      });

      res.json({
        success: true,
        saved: true,
        nextQuestionId: nextQuestionId,
        done,
        questionCount: answeredIds.length,
        ...(nextQuestionData.question_id ? { nextQuestion: nextQuestionData } : {}),
      });
    } catch (err) {
      console.error("[session.answer] error:", err);
      next(err);
    }
  }
);
