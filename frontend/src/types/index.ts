import dotenv from "dotenv";
dotenv.config()
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
  questionCount?: number;
  nextQuestionId?: string;
  isAiGenerated?: boolean;
  nextQuestion?: {
    question_id: string;
    text: string;
    type: string;
    options?: string[];
  };
}

export interface AnswerResponse {
  success: boolean;
  saved: boolean;
  nextQuestionId?: string;
  done?: boolean;
  questionCount?: number;
  nextQuestion?: {
    question_id: string;
    text: string;
    type: string;
    options?: string[];
  };
}

// ─── Dashboard types ────────────────────────────────────────

export interface DashboardOverview {
  total_sessions: number;
  completed_sessions: number;
  total_responses: number;
}

export interface BranchDistItem {
  concern_branch: string;
  session_count: number;
  completed_count: number;
}

export interface RatingAvgItem {
  concern_branch: string;
  question_id: string;
  question_text: string;
  avg_rating: string;
  response_count: string;
}

export interface ThemeEntry {
  branch: string;
  themes: string[];
  suggestions: string[];
}

export interface InsightsData {
  overview: DashboardOverview;
  branch_distribution: BranchDistItem[];
  rating_averages: RatingAvgItem[];
  themes: ThemeEntry[];
}

export interface InsightsResponse {
  success: boolean;
  data: InsightsData;
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
