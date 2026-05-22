import { Router, Request, Response } from "express";

export const authRouter = Router();

// POST /api/auth/register
authRouter.post("/register", async (_req: Request, res: Response) => {
  // TODO: Implement user registration with bcrypt + JWT
  res.status(501).json({ message: "Registration not yet implemented" });
});

// POST /api/auth/login
authRouter.post("/login", async (_req: Request, res: Response) => {
  // TODO: Implement login with JWT token generation
  res.status(501).json({ message: "Login not yet implemented" });
});

// GET /api/auth/me
authRouter.get("/me", async (_req: Request, res: Response) => {
  // TODO: Return current user from JWT
  res.status(501).json({ message: "Profile endpoint not yet implemented" });
});
