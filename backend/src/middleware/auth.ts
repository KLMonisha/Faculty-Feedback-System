import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// ─── Types ──────────────────────────────────────────────────
export interface TokenPayload {
  session_id: string;
  role: "anonymous" | "admin";
  iat?: number;
  exp?: number;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      token?: TokenPayload;
    }
  }
}

// ─── Sign a JWT ─────────────────────────────────────────────
export const signToken = (payload: Omit<TokenPayload, "iat" | "exp">): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "2h" });
};

// ─── Verify any valid JWT ───────────────────────────────────
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: { message: "Missing or malformed Authorization header" },
    });
    return;
  }

  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET) as TokenPayload;
    req.token = decoded;
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { message: "Invalid or expired token" },
    });
  }
};

// ─── Require admin role ─────────────────────────────────────
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // requireAuth must run first
  if (!req.token || req.token.role !== "admin") {
    res.status(403).json({
      success: false,
      error: { message: "Admin access required" },
    });
    return;
  }
  next();
};
