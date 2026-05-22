import axios, { AxiosError } from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// ─── Types ──────────────────────────────────────────────────
interface AnswerEntry {
  question_id: string;
  answer: string;
}

export interface NextQuestionAIResponse {
  next_question_id: string | null;
  done: boolean;
}

export interface ThemeSummary {
  themes: string[];
  suggestions: string[];
}

// ─── Get next adaptive question ─────────────────────────────
export const getNextQuestion = async (
  sessionId: string,
  concernBranch: string,
  answersSoFar: AnswerEntry[]
): Promise<NextQuestionAIResponse> => {
  try {
    const { data } = await axios.post<NextQuestionAIResponse>(
      `${AI_SERVICE_URL}/api/analysis/next-question`,
      {
        session_id: sessionId,
        concern_branch: concernBranch,
        answers_so_far: answersSoFar,
      },
      { timeout: 10_000 }
    );
    return data;
  } catch (err) {
    console.warn(
      "AI service unavailable, falling back to sequential questions:",
      (err as AxiosError).message
    );
    throw new AiServiceUnavailableError();
  }
};

// ─── Generate theme insights ────────────────────────────────
export const generateThemeInsights = async (
  responses: AnswerEntry[]
): Promise<ThemeSummary> => {
  try {
    const { data } = await axios.post<ThemeSummary>(
      `${AI_SERVICE_URL}/api/analysis/generate-insights`,
      { responses },
      { timeout: 30_000 }
    );
    return data;
  } catch (err) {
    console.warn(
      "AI theme generation failed:",
      (err as AxiosError).message
    );
    return {
      themes: [],
      suggestions: ["Theme analysis is temporarily unavailable."],
    };
  }
};

// ─── Custom error ───────────────────────────────────────────
export class AiServiceUnavailableError extends Error {
  constructor() {
    super("AI service is currently unavailable");
    this.name = "AiServiceUnavailableError";
  }
}
