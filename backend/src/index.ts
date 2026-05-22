import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

import { healthRouter } from "./routes/health";
import { feedbackRouter } from "./routes/feedback";
import { authRouter } from "./routes/auth";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config({ path: "../.env" });

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ──────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
app.use(morgan("dev"));
app.use(express.json());

// ─── Routes ─────────────────────────────────────────────────
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/feedback", feedbackRouter);

// ─── Error handling ─────────────────────────────────────────
app.use(errorHandler);

// ─── Start ──────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});

export default app;
