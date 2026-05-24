import { Pool, QueryResult } from "pg";
import { createClient, RedisClientType } from "redis";

// ─── PostgreSQL ─────────────────────────────────────────────
export const pool = new Pool({
  user: "postgres",
  password: "monisha123",
  host: "localhost",
  port: 5432,
  database: "faculty_feedback",
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL client error:", err);
  process.exit(-1);
});

export const query = <T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => pool.query<T>(text, params);

// ─── Redis ──────────────────────────────────────────────────
export const redis: RedisClientType = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redis.on("error", (err) => {
  console.error("Redis client error:", err);
});

export const connectRedis = async (): Promise<void> => {
  if (!redis.isOpen) {
    await redis.connect();
    console.log("✅ Connected to Redis");
  }
};

// ─── Redis helpers ──────────────────────────────────────────
const SESSION_TTL = 7200; // 2 hours in seconds

export const cacheSessionState = async (
  sessionId: string,
  state: Record<string, unknown>
): Promise<void> => {
  await redis.setEx(
    `session:${sessionId}`,
    SESSION_TTL,
    JSON.stringify(state)
  );
};

export const getCachedSessionState = async (
  sessionId: string
): Promise<Record<string, unknown> | null> => {
  const data = await redis.get(`session:${sessionId}`);
  return data ? JSON.parse(data) : null;
};
