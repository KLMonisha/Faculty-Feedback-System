// ─── API response types ─────────────────────────────────────

export interface StartSessionResponse {
  success: boolean;
  session_id: string;
  token: string;
  first_question: Question | null;
}

export interface Question {
  question_id: string;
  text: string;
  type: "rating" | "mcq" | "open";
  options?: string[];
}

export interface NextQuestionResponse {
  success: boolean;
  done: boolean;
  question_id?: string;
  text?: string;
  type?: "rating" | "mcq" | "open";
  options?: string[];
}

export interface AnswerResponse {
  success: boolean;
  saved: boolean;
}

// ─── App state ──────────────────────────────────────────────

export type Page = "welcome" | "question" | "thankyou";

export interface SessionState {
  sessionId: string;
  token: string;
  concernBranch: string;
  currentQuestion: Question | null;
  questionNumber: number;
}

export interface Branch {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
}
