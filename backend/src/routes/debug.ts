// ─── Debug Endpoint (Development Only) ──────────────────────
// GET /api/debug/session/:id
// Returns the full Redis session state as JSON.
// Only active when NODE_ENV=development.

import { Router, Request, Response, NextFunction } from "express";
import { getCachedSessionState } from "../config/database";

export const debugRouter = Router();

// Gate: only register routes if in development mode
if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
  debugRouter.get(
    "/session/:id",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const sessionId = req.params.id as string;
        const cached = await getCachedSessionState(sessionId);

        if (!cached) {
          res.status(404).json({
            success: false,
            error: { message: "No cached state found for this session" },
          });
          return;
        }

        // Parse JSON-stringified fields for readability
        const state = { ...cached };
        if (typeof state.answeredIds === "string") {
          try { state.answeredIds = JSON.parse(state.answeredIds as string); } catch {}
        }
        if (typeof state.answerRatings === "string") {
          try { state.answerRatings = JSON.parse(state.answerRatings as string); } catch {}
        }
        if (typeof state.answered_ids === "string") {
          try { state.answered_ids = JSON.parse(state.answered_ids as string); } catch {}
        }

        res.json({
          success: true,
          session_id: sessionId,
          state,
        });
      } catch (err) {
        console.error("[debug.session] error:", err);
        next(err);
      }
    }
  );

  console.log("🐛 Debug routes enabled (NODE_ENV=development)");
}
