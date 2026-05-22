import axios from "axios";
import type {
  StartSessionResponse,
  NextQuestionResponse,
  AnswerResponse,
  InsightsResponse,
} from "../types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001",
  headers: { "Content-Type": "application/json" },
});

// ─── Session ────────────────────────────────────────────────

export async function startSession(
  concernBranch: string
): Promise<StartSessionResponse> {
  const { data } = await api.post<StartSessionResponse>(
    "/api/session/start",
    { concern_branch: concernBranch }
  );
  return data;
}

export async function getNextQuestion(
  sessionId: string,
  token: string
): Promise<NextQuestionResponse> {
  const { data } = await api.get<NextQuestionResponse>(
    `/api/session/${sessionId}/next-question`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

export async function submitAnswer(
  sessionId: string,
  token: string,
  questionId: string,
  answer: string
): Promise<AnswerResponse> {
  const { data } = await api.post<AnswerResponse>(
    `/api/session/${sessionId}/answer`,
    { question_id: questionId, answer },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

// ─── Dashboard ──────────────────────────────────────────────

export async function fetchInsights(
  adminToken: string
): Promise<InsightsResponse> {
  const { data } = await api.get<InsightsResponse>(
    "/api/dashboard/insights",
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  return data;
}
