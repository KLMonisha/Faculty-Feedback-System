import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import axios from "axios";

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
  getUnusedBranchQuestion,
} from "../engines/questionEngine";
import { QUESTION_FLOW } from "../data/questionFlow";

export const sessionRouter = Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// ─── Branch-specific fallback closers ───────────────────────
const BRANCH_FALLBACK_CLOSERS: Record<string, string> = {
  clarity: "What single change would most improve your learning experience?",
  workload: "What would make the workload feel more manageable?",
  assessment: "What would make assessments feel fairer to you?",
  support: "What kind of support would make the biggest difference?",
};

// ─── Helper: Build full conversation history ────────────────
interface QAHistoryEntry {
  question_text: string;
  answer: string;
  type: string;
}

interface AiGeneratedQuestion {
  id: string;
  text: string;
  type: string;
  options?: string[];
  answer: string | null;
}

function buildFullHistory(
  answerRatings: Record<string, string | number>,
  answeredIds: string[],
  aiGeneratedQuestions: AiGeneratedQuestion[]
): QAHistoryEntry[] {
  const history: QAHistoryEntry[] = [];

  for (const qId of answeredIds) {
    const answer = String(answerRatings[qId] ?? "");

    // Check static QUESTION_FLOW first
    const staticQ = QUESTION_FLOW[qId];
    if (staticQ) {
      history.push({
        question_text: staticQ.text,
        answer,
        type: staticQ.type,
      });
      continue;
    }

    // Check AI-generated questions
    const aiQ = aiGeneratedQuestions.find((q) => q.id === qId);
    if (aiQ) {
      history.push({
        question_text: aiQ.text,
        answer,
        type: aiQ.type,
      });
      continue;
    }

    // Fallback: placeholder (will be enriched later)
    history.push({
      question_text: `Question ${qId}`,
      answer,
      type: "open",
    });
  }

  return history;
}

// Fetch question text from DB for old-format IDs
async function lookupQuestionText(questionId: string): Promise<string> {
  try {
    const result = await query<{ text: string }>(
      `SELECT text FROM questions WHERE id = $1`,
      [questionId]
    );
    return result.rows[0]?.text || `Question ${questionId}`;
  } catch {
    return `Question ${questionId}`;
  }
}

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
        answeredIds: JSON.stringify([]),
        answerRatings: JSON.stringify({}),
        lastQuestionType: "",
        questionCount: "0",
        ai_generated_questions: JSON.stringify([]),
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
// Q1-Q3: static QUESTION_FLOW transitions
// Q4-Q7: AI-generated personalised follow-ups
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
      const answerRatings: Record<string, string | number> = cached?.answerRatings
        ? JSON.parse(cached.answerRatings as string)
        : {};
      const aiGeneratedQuestions: AiGeneratedQuestion[] = cached?.ai_generated_questions
        ? JSON.parse(cached.ai_generated_questions as string)
        : [];

      // 3. Check if session should end
      if (shouldEndSession(answeredIds, session.concern_branch)) {
        await query(
          `UPDATE feedback_sessions SET completed = TRUE WHERE id = $1`,
          [sessionId]
        );
        res.json({ success: true, done: true, questionCount });
        return;
      }

      // ─── STATIC FLOW: Q1-Q3 (questionCount < 3) ───────────
      if (questionCount < 3) {
        // First question (count = 0): use ML-predicted first question
        if (questionCount === 0) {
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

          try {
            const aiResponse = await getAINextQuestion(
              sessionId,
              session.concern_branch,
              answersSoFar
            );

            if (!aiResponse.done && aiResponse.next_question_id) {
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
                  isAiGenerated: false,
                });
                return;
              }
            }
          } catch (err) {
            if (!(err instanceof AiServiceUnavailableError)) throw err;
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
                isAiGenerated: false,
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
            isAiGenerated: false,
          });
          return;
        }

        // Q2-Q3: use questionEngine static transitions
        const lastAnsweredId = answeredIds[answeredIds.length - 1];
        const lastAnswer = answerRatings[lastAnsweredId] ?? "";

        const nextQuestionId = engineGetNextQuestion(
          lastAnsweredId,
          lastAnswer,
          answeredIds,
          session.concern_branch
        );

        if (nextQuestionId) {
          const questionObj = QUESTION_FLOW[nextQuestionId];
          if (questionObj) {
            res.json({
              success: true,
              done: false,
              question_id: questionObj.id,
              text: questionObj.text,
              type: questionObj.type,
              options: questionObj.options,
              questionCount,
              isAiGenerated: false,
            });
            return;
          }
        }

        // Fallback for static: find any unused
        const fallbackId = getUnusedBranchQuestion(
          session.concern_branch,
          answeredIds,
          lastQuestionType
        );
        if (fallbackId) {
          const fallbackQ = QUESTION_FLOW[fallbackId];
          if (fallbackQ) {
            res.json({
              success: true,
              done: false,
              question_id: fallbackQ.id,
              text: fallbackQ.text,
              type: fallbackQ.type,
              options: fallbackQ.options,
              questionCount,
              isAiGenerated: false,
            });
            return;
          }
        }
      }

      // ─── AI GENERATION MODE: Q4-Q7 (questionCount >= 3) ───
      const fullHistory = buildFullHistory(
        answerRatings,
        answeredIds,
        aiGeneratedQuestions
      );

      // Enrich history: for old-format IDs, look up text from DB
      for (let i = 0; i < fullHistory.length; i++) {
        if (fullHistory[i].question_text.startsWith("Question ")) {
          const qId = answeredIds[i];
          if (qId) {
            fullHistory[i].question_text = await lookupQuestionText(qId);
          }
        }
      }

      const nextQuestionNumber = questionCount + 1;

      // Try AI generation with retry + fallback chain
      let generated: { text: string; type: string; options?: string[] } | null = null;

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await axios.post(
            `${AI_SERVICE_URL}/api/analysis/generate-question`,
            {
              branch: session.concern_branch,
              answers_so_far: fullHistory,
              question_number: nextQuestionNumber,
              previously_generated_questions: aiGeneratedQuestions.map((q) => q.text),
              last_question_type: lastQuestionType,
            },
            { timeout: 15_000 }
          );
          generated = response.data;
          break;
        } catch (err) {
          console.warn(
            `[DynamicFlow] Q${nextQuestionNumber} generation attempt ${attempt} failed:`,
            (err as Error).message
          );
          if (attempt === 1) {
            // Wait 1 second before retry
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      }

      // Fallback chain if AI generation failed
      if (!generated) {
        // Fallback 1: unused static question
        const fallbackStaticId = getUnusedBranchQuestion(
          session.concern_branch,
          answeredIds,
          lastQuestionType
        );

        if (fallbackStaticId) {
          const fallbackQ = QUESTION_FLOW[fallbackStaticId];
          if (fallbackQ) {
            console.log(
              `[DynamicFlow] Q${nextQuestionNumber} generation failed, using fallback: ${fallbackQ.text}`
            );
            res.json({
              success: true,
              done: false,
              question_id: fallbackQ.id,
              text: fallbackQ.text,
              type: fallbackQ.type,
              options: fallbackQ.options,
              questionCount,
              isAiGenerated: false,
            });
            return;
          }
        }

        // Fallback 2: generic branch-aware closer
        const closerText =
          BRANCH_FALLBACK_CLOSERS[session.concern_branch] ||
          "Is there anything else you would like the faculty to know?";
        const closerId = `ai_generated_0${nextQuestionNumber - 3}`;

        console.log(
          `[DynamicFlow] Q${nextQuestionNumber} generation failed, using fallback: ${closerText}`
        );

        // Store the fallback as an AI-generated question
        aiGeneratedQuestions.push({
          id: closerId,
          text: closerText,
          type: "open",
          answer: null,
        });

        await cacheSessionState(sessionId, {
          ...(cached || {}),
          ai_generated_questions: JSON.stringify(aiGeneratedQuestions),
        });

        res.json({
          success: true,
          done: false,
          question_id: closerId,
          text: closerText,
          type: "open",
          questionCount,
          isAiGenerated: true,
        });
        return;
      }

      // Success: assign a sequential ID and store
      const newId = `ai_generated_0${nextQuestionNumber - 3}`;

      aiGeneratedQuestions.push({
        id: newId,
        text: generated.text,
        type: generated.type,
        options: generated.options,
        answer: null,
      });

      await cacheSessionState(sessionId, {
        ...(cached || {}),
        ai_generated_questions: JSON.stringify(aiGeneratedQuestions),
      });

      res.json({
        success: true,
        done: false,
        question_id: newId,
        text: generated.text,
        type: generated.type,
        options: generated.options,
        questionCount,
        isAiGenerated: true,
      });
    } catch (err) {
      console.error("[session.next-question] error:", err);
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// POST /api/session/:session_id/answer
// Handles both static and AI-generated question answers
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
      const isAiGenerated = question_id.startsWith("ai_generated_");

      // 2. Verify question exists (check DB, QUESTION_FLOW, or AI-generated)
      if (!isAiGenerated) {
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
      }

      // 3. Store response in PostgreSQL
      //    For AI-generated questions, INSERT the question into the
      //    questions table first so FK constraint is satisfied
      if (isAiGenerated) {
        const cachedForAi = await getCachedSessionState(sessionId);
        const aiGenQuestions: AiGeneratedQuestion[] = cachedForAi?.ai_generated_questions
          ? JSON.parse(cachedForAi.ai_generated_questions as string)
          : [];
        const aiQ = aiGenQuestions.find((q) => q.id === question_id);

        if (aiQ) {
          // Ensure the question exists in the DB for FK constraint
          await query(
            `INSERT INTO questions (id, branch, text, type, "order")
             VALUES ($1, $2, $3, $4::question_type, $5)
             ON CONFLICT (id) DO NOTHING`,
            [
              question_id,
              branch,
              aiQ.text,
              aiQ.type === "mcq" ? "mcq" : "open",
              100 + parseInt(question_id.replace(/\D/g, "") || "0"),
            ]
          );
        }
      }

      await query(
        `INSERT INTO responses (session_id, question_id, answer)
         VALUES ($1, $2, $3)
         ON CONFLICT (session_id, question_id)
         DO UPDATE SET answer = EXCLUDED.answer, answered_at = NOW()`,
        [sessionId, question_id, answer]
      );

      // 4. Update session state in Redis
      const cached = await getCachedSessionState(sessionId);

      const answeredIds: string[] = cached?.answeredIds
        ? JSON.parse(cached.answeredIds as string)
        : [];
      const answerRatings: Record<string, string | number> = cached?.answerRatings
        ? JSON.parse(cached.answerRatings as string)
        : {};
      let aiGeneratedQuestions: AiGeneratedQuestion[] = cached?.ai_generated_questions
        ? JSON.parse(cached.ai_generated_questions as string)
        : [];

      // Push the new question ID (avoid duplicates)
      if (!answeredIds.includes(question_id)) {
        answeredIds.push(question_id);
      }

      // Save the answer into answerRatings
      answerRatings[question_id] = answer;

      // If AI-generated, update the answer in the ai_generated_questions array
      if (isAiGenerated) {
        aiGeneratedQuestions = aiGeneratedQuestions.map((q) =>
          q.id === question_id ? { ...q, answer } : q
        );
      }

      // Determine the question type
      const questionFlowItem = QUESTION_FLOW[question_id];
      const aiQ = aiGeneratedQuestions.find((q) => q.id === question_id);
      const lastQuestionType = questionFlowItem?.type || aiQ?.type || "open";

      // Check if session should end
      const done = shouldEndSession(answeredIds, branch);

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
        ai_generated_questions: JSON.stringify(aiGeneratedQuestions),
        last_answered_at: new Date().toISOString(),
      });

      res.json({
        success: true,
        saved: true,
        done,
        questionCount: answeredIds.length,
      });
    } catch (err) {
      console.error("[session.answer] error:", err);
      next(err);
    }
  }
);
