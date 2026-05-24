import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import { connectRedis } from "./config/database";
import { query as dbQuery } from "./config/database";
import { healthRouter } from "./routes/health";
import { sessionRouter } from "./routes/session";
import { dashboardRouter } from "./routes/dashboard";
import { errorHandler } from "./middleware/errorHandler";
import { debugRouter } from "./routes/debug";

// ─── Load env ───────────────────────────────────────────────
dotenv.config({ path: "../.env" });
console.log(process.env.POSTGRES_PASSWORD);
const app = express();
const PORT = process.env.PORT || 3001;

// ─── Security middleware ────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || /^http:\/\/localhost:\d+$/,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Rate limiting ──────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: "Too many requests, please try again later." },
  },
});

const sessionStartLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 5,               // 5 session starts per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: "Too many sessions created, slow down." },
  },
});

app.use("/api", globalLimiter);

// ─── Parsing & logging ─────────────────────────────────────
app.use(express.json({ limit: "16kb" }));
app.use(morgan("dev"));

// ─── Routes ─────────────────────────────────────────────────
app.use("/api/health", healthRouter);
app.use("/api/session/start", sessionStartLimiter);
app.use("/api/session", sessionRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/debug", debugRouter);

// ─── Error handling ─────────────────────────────────────────
app.use(errorHandler);

// ─── Start ──────────────────────────────────────────────────
const start = async () => {
  try {
    // Try to connect to Redis with a 5-second timeout
    await Promise.race([
      connectRedis(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Redis connection timeout")), 5000))
    ]);
    console.log("✅ Redis connected");
  } catch (err) {
    console.warn("⚠️  Redis unavailable — session caching disabled:", (err as Error).message);
  }

  // Quick DB connectivity check to surface auth/connectivity errors early
  try {
    await dbQuery("SELECT 1");
    console.log("✅ PostgreSQL reachable");
  } catch (err) {
    console.error("❌ PostgreSQL connection test failed:", (err as Error).message);
  }

  const server = app.listen(PORT, () => {
    console.log(`Backend API running on http://localhost:${PORT}`);
    console.log(`   POST /api/session/start`);
    console.log(`   GET  /api/session/:id/next-question`);
    console.log(`   POST /api/session/:id/answer`);
    console.log(`   GET  /api/dashboard/insights`);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Kill the existing process or change PORT in .env`);
      process.exit(1);
    }
    throw err;
  });
};

start();

export default app;
