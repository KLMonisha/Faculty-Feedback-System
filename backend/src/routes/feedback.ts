import { Router, Request, Response } from "express";

export const feedbackRouter = Router();

// GET /api/feedback
feedbackRouter.get("/", async (_req: Request, res: Response) => {
  // TODO: Fetch all feedback entries from PostgreSQL
  res.json({ data: [], message: "Feedback list endpoint" });
});

// POST /api/feedback
feedbackRouter.post("/", async (_req: Request, res: Response) => {
  // TODO: Create feedback entry and enqueue for AI analysis
  res.status(501).json({ message: "Create feedback not yet implemented" });
});

// GET /api/feedback/:id
feedbackRouter.get("/:id", async (req: Request, res: Response) => {
  // TODO: Fetch single feedback by ID
  res.json({ data: null, id: req.params.id });
});

// GET /api/feedback/:id/analysis
feedbackRouter.get("/:id/analysis", async (req: Request, res: Response) => {
  // TODO: Fetch AI analysis results for a feedback entry
  res.json({ data: null, id: req.params.id, message: "Analysis endpoint" });
});
