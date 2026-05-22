import { Router, Request, Response, NextFunction } from "express";

import { query } from "../config/database";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { generateThemeInsights } from "../services/aiService";

export const dashboardRouter = Router();

// ─────────────────────────────────────────────────────────────
// GET /api/dashboard/insights
// Admin-only — returns aggregated data, NEVER individual responses
// ─────────────────────────────────────────────────────────────
dashboardRouter.get(
  "/insights",
  requireAuth,
  requireAdmin,
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Branch distribution — how many sessions per branch
      const branchDistribution = await query<{
        concern_branch: string;
        session_count: string;
        completed_count: string;
      }>(`
        SELECT
          concern_branch,
          COUNT(*)::int                              AS session_count,
          COUNT(*) FILTER (WHERE completed)::int     AS completed_count
        FROM feedback_sessions
        GROUP BY concern_branch
        ORDER BY session_count DESC
      `);

      // 2. Rating averages — only for rating-type questions, aggregated
      //    Uses anonymous_responses view (no student identity)
      const ratingAverages = await query<{
        concern_branch: string;
        question_id: string;
        question_text: string;
        avg_rating: string;
        response_count: string;
      }>(`
        SELECT
          ar.concern_branch,
          ar.question_id,
          ar.question_text,
          ROUND(AVG(ar.answer::numeric), 2)   AS avg_rating,
          COUNT(*)::int                        AS response_count
        FROM anonymous_responses ar
        WHERE ar.question_type = 'rating'
          AND ar.answer ~ '^[0-9]+(\\.[0-9]+)?$'
        GROUP BY ar.concern_branch, ar.question_id, ar.question_text
        ORDER BY ar.concern_branch, ar.question_id
      `);

      // 3. LLM-generated themes per branch (from open-ended answers)
      //    Fetch question_id + answer via the anonymous_responses view
      const openResponses = await query<{
        concern_branch: string;
        question_id: string;
        answer: string;
      }>(`
        SELECT ar.concern_branch, ar.question_id, ar.answer
        FROM anonymous_responses ar
        WHERE ar.question_type = 'open'
        ORDER BY ar.concern_branch
      `);

      // Group by branch as {question_id, answer}[] (matches AI service schema)
      const responsesByBranch: Record<
        string,
        { question_id: string; answer: string }[]
      > = {};
      for (const row of openResponses.rows) {
        if (!responsesByBranch[row.concern_branch]) {
          responsesByBranch[row.concern_branch] = [];
        }
        responsesByBranch[row.concern_branch].push({
          question_id: row.question_id,
          answer: row.answer,
        });
      }

      // Generate themes for each branch (parallel requests to AI service)
      // Only call for branches with >= 5 responses (AI service minimum)
      const themeEntries = await Promise.all(
        Object.entries(responsesByBranch)
          .filter(([, responses]) => responses.length >= 5)
          .map(async ([branch, responses]) => {
            const insights = await generateThemeInsights(responses);
            return { branch, ...insights };
          })
      );

      // 4. Overall stats
      const overallStats = await query<{
        total_sessions: string;
        completed_sessions: string;
        total_responses: string;
      }>(`
        SELECT
          (SELECT COUNT(*)::int FROM feedback_sessions)             AS total_sessions,
          (SELECT COUNT(*)::int FROM feedback_sessions WHERE completed) AS completed_sessions,
          (SELECT COUNT(*)::int FROM responses)                     AS total_responses
      `);

      res.json({
        success: true,
        data: {
          overview: overallStats.rows[0] || {
            total_sessions: 0,
            completed_sessions: 0,
            total_responses: 0,
          },
          branch_distribution: branchDistribution.rows,
          rating_averages: ratingAverages.rows,
          themes: themeEntries,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
