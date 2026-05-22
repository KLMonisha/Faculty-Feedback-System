import { Pool } from "pg";
import { createClient } from "redis";

// ─── PostgreSQL ─────────────────────────────────────────────
export const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL client error:", err);
  process.exit(-1);
});

export const query = (text: string, params?: unknown[]) =>
  pool.query(text, params);

// ─── Redis ──────────────────────────────────────────────────
export const redisClient = createClient({
  url: process.env.REDIS_URL,
});

redisClient.on("error", (err) => {
  console.error("Redis client error:", err);
});

export const connectRedis = async () => {
  await redisClient.connect();
  console.log("✅ Connected to Redis");
};
