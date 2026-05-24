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
 *
 * @param currentQuestionId - The question that was just answered
 * @param answer            - The student's answer (number for rating, string for mcq/open)
 * @param answeredIds       - All question IDs answered so far (including current)
 * @param branch            - The concern branch (clarity, workload, assessment, support)
 * @returns The next question ID, or null if the session should end
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
    // Fallback: try to find any unused question in the branch
    const fallback = getUnusedBranchQuestion(branch, answeredIds, "");
    console.log(
      `[QuestionEngine] branch: ${branch} | answered: ${answeredIds.length} | current: ${currentQuestionId} | next: ${fallback}`
    );
    return fallback;
  }

  let resolvedNextId: string | null = null;

  // Determine next based on answer type
  const numericAnswer = typeof answer === "number" ? answer : Number(answer);
  const isNumeric = !isNaN(numericAnswer) && current.type === "rating";

  if (isNumeric) {
    // Rating-based transitions
    if (numericAnswer <= 2) {
      resolvedNextId = current.transitions.low ?? null;
    } else if (numericAnswer === 3) {
      resolvedNextId = current.transitions.medium ?? null;
    } else {
      // 4-5
      resolvedNextId = current.transitions.high ?? null;
    }
  } else {
    // MCQ or open-ended — use default transition
    resolvedNextId = current.transitions.default ?? null;
  }

  // If the resolved next question was already answered, find an unused one
  if (resolvedNextId && answeredIds.includes(resolvedNextId)) {
    resolvedNextId = getUnusedBranchQuestion(branch, answeredIds, current.type);
  }

  // If resolved is null (end of chain), try to find unused questions
  if (resolvedNextId === null) {
    resolvedNextId = getUnusedBranchQuestion(branch, answeredIds, current.type);
  }

  console.log(
    `[QuestionEngine] branch: ${branch} | answered: ${answeredIds.length} | current: ${currentQuestionId} | next: ${resolvedNextId}`
  );

  return resolvedNextId;
}

// ─── getUnusedBranchQuestion ────────────────────────────────
/**
 * Finds an unanswered question in the given branch.
 * Avoids back-to-back open questions by preferring rating/mcq
 * when the last question was open.
 *
 * @param branch           - The concern branch
 * @param answeredIds      - All question IDs answered so far
 * @param lastQuestionType - The type of the most recently answered question
 * @returns The best candidate question ID, or null if none remain
 */
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

  // If the last question was open, prefer a non-open question to avoid
  // back-to-back open questions (which feel tedious)
  if (lastQuestionType === "open") {
    const preferred = unused.find((q) => q.type === "rating" || q.type === "mcq");
    if (preferred) {
      return preferred.id;
    }
  }

  // Otherwise, return the first unused question (preserves natural order)
  return unused[0].id;
}

// ─── shouldEndSession ───────────────────────────────────────
/**
 * Determines whether the feedback session should end.
 *
 * Rules:
 * - Never end before MIN_QUESTIONS (5) are answered
 * - End if MIN_QUESTIONS are met AND no unused questions remain
 * - Always end at MAX_QUESTIONS (7) — don't over-survey
 *
 * @param answeredIds - All question IDs answered so far
 * @param branch      - The concern branch
 * @returns true if the session should end
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

  // Between 5-6: end only if no unused questions remain
  const hasUnused = getUnusedBranchQuestion(branch, answeredIds, "") !== null;
  const shouldEnd = !hasUnused;

  console.log(
    `[QuestionEngine] branch: ${branch} | answered: ${count} | shouldEndSession: ${shouldEnd} (${hasUnused ? "unused questions remain" : "no unused questions"})`
  );

  return shouldEnd;
}
