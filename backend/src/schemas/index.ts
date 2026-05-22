import { z } from "zod";

// ─── POST /api/session/start ────────────────────────────────
export const StartSessionSchema = z.object({
  concern_branch: z
    .string()
    .trim()
    .min(1, "concern_branch is required")
    .refine(
      (v) => ["clarity", "workload", "assessment", "support"].includes(v),
      { message: "concern_branch must be one of: clarity, workload, assessment, support" }
    ),
});
export type StartSessionInput = z.infer<typeof StartSessionSchema>;

// ─── POST /api/session/:session_id/answer ───────────────────
export const SubmitAnswerSchema = z.object({
  question_id: z
    .string()
    .trim()
    .min(1, "question_id is required"),
  answer: z
    .string()
    .trim()
    .min(1, "answer is required")
    .max(5000, "answer must be under 5000 characters"),
});
export type SubmitAnswerInput = z.infer<typeof SubmitAnswerSchema>;

// ─── Params ─────────────────────────────────────────────────
export const SessionIdParamSchema = z.object({
  session_id: z.string().uuid("session_id must be a valid UUID"),
});
export type SessionIdParam = z.infer<typeof SessionIdParamSchema>;
