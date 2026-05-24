// ─── Adaptive Question Engine ───────────────────────────────
// Drives the multi-step question flow using transition rules
// from questionFlow.ts. Replaces the old single-prediction model
// with a full state-machine approach.

import { QUESTION_FLOW, BRANCH_QUESTIONS } from "../data/questionFlow";
import type { QuestionFlowItem } from "../data/questionFlow";

// ─── Constants ──────────────────────────────────────────────
const MIN_QUESTIONS = 5;   // Hard minimum before ending
const MAX_QUESTIONS = 7;   // Hard maximum — don't over-survey

// ─── getNextQuestion ────────────────────────────────────────
/**
 * Determines the next question based on the current question's
 * transition rules and the student's answer.
 * Only used for static questions (Q1-Q3). Q4+ use AI generation.
 */
export function getNextQuestion(
  currentQuestionId: string,
  answer: string | number,
  answeredIds: string[],
  branch: string
): string | null {
  const current = QUESTION_FLOW[currentQuestionId];

  if (!current) {
    console.warn(`[QuestionEngine] Unknown question ID: ${currentQuestionId}`);
    const fallback = getUnusedBranchQuestion(branch, answeredIds, "");
    console.log(
      `[QuestionEngine] branch: ${branch} | answered: ${answeredIds.length} | current: ${currentQuestionId} | next: ${fallback}`
    );
    return fallback;
  }

  let resolvedNextId: string | null = null;

  const numericAnswer = typeof answer === "number" ? answer : Number(answer);
  const isNumeric = !isNaN(numericAnswer) && current.type === "rating";

  if (isNumeric) {
    if (numericAnswer <= 2) {
      resolvedNextId = current.transitions.low ?? null;
    } else if (numericAnswer === 3) {
      resolvedNextId = current.transitions.medium ?? null;
    } else {
      resolvedNextId = current.transitions.high ?? null;
    }
  } else {
    resolvedNextId = current.transitions.default ?? null;
  }

  if (resolvedNextId && answeredIds.includes(resolvedNextId)) {
    resolvedNextId = getUnusedBranchQuestion(branch, answeredIds, current.type);
  }

  if (resolvedNextId === null) {
    resolvedNextId = getUnusedBranchQuestion(branch, answeredIds, current.type);
  }

  console.log(
    `[QuestionEngine] branch: ${branch} | answered: ${answeredIds.length} | current: ${currentQuestionId} | next: ${resolvedNextId}`
  );

  return resolvedNextId;
}

// ─── getUnusedBranchQuestion ────────────────────────────────
export function getUnusedBranchQuestion(
  branch: string,
  answeredIds: string[],
  lastQuestionType: string
): string | null {
  const branchQuestions = BRANCH_QUESTIONS[branch];
  if (!branchQuestions) {
    console.warn(`[QuestionEngine] Unknown branch: ${branch}`);
    return null;
  }

  const unused = branchQuestions.filter((q) => !answeredIds.includes(q.id));

  if (unused.length === 0) {
    return null;
  }

  if (lastQuestionType === "open") {
    const preferred = unused.find((q) => q.type === "rating" || q.type === "mcq");
    if (preferred) {
      return preferred.id;
    }
  }

  return unused[0].id;
}

// ─── shouldEndSession ───────────────────────────────────────
/**
 * Determines whether the feedback session should end.
 *
 * Updated for AI-gen mode: in AI generation mode (questionCount >= 3),
 * the AI can always generate more questions, so we rely purely on
 * count bounds rather than checking QUESTION_FLOW for unused questions.
 *
 * Rules:
 * - Never end before MIN_QUESTIONS (5) are answered
 * - Always end at MAX_QUESTIONS (7)
 * - Between 5-6: never end (AI can always generate more)
 */
export function shouldEndSession(
  answeredIds: string[],
  branch: string
): boolean {
  const count = answeredIds.length;

  // Hard minimum: never end before 5 questions
  if (count < MIN_QUESTIONS) {
    console.log(
      `[QuestionEngine] branch: ${branch} | answered: ${count} | shouldEndSession: false (minimum not reached)`
    );
    return false;
  }

  // Hard maximum: always end at 7 questions
  if (count >= MAX_QUESTIONS) {
    console.log(
      `[QuestionEngine] branch: ${branch} | answered: ${count} | shouldEndSession: true (maximum reached)`
    );
    return true;
  }

  // Between 5-6: in AI-gen mode, never end early — AI can always
  // generate more questions up to the maximum
  console.log(
    `[QuestionEngine] branch: ${branch} | answered: ${count} | shouldEndSession: false (AI can generate more)`
  );
  return false;
}
