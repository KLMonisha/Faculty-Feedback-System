import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { submitAnswer, getNextQuestion } from "../api/client";
import ProgressBar from "../components/ProgressBar";
import StarRating from "../components/StarRating";
import type { SessionState, Question } from "../types";

const MAX_QUESTIONS = 7;
const MIN_QUESTIONS_BEFORE_EXIT = 5;

// MCQ options per question type (fallback if API doesn't provide them)
const MCQ_OPTIONS: Record<string, string[]> = {
  clarity_02: ["Slides / Presentations", "Live demonstrations", "Textbook / readings", "Group discussions"],
  workload_02: ["Assignments", "Lab work", "Readings", "Exam preparation"],
  assessment_02: ["Written exams", "Projects / portfolios", "Quizzes", "Peer assessment"],
  support_02: ["Office hours", "Email", "Discussion forums", "Teaching assistants"],
};

interface Props {
  session: SessionState;
  onComplete: () => void;
  onUpdateSession: (session: SessionState) => void;
}

export default function QuestionPage({ session, onComplete, onUpdateSession }: Props) {
  const [answer, setAnswer] = useState("");
  const [ratingValue, setRatingValue] = useState(0);

  const question = session.currentQuestion;

  // ── Submit answer + fetch next ──────────────────────────
  const mutation = useMutation({
    mutationFn: async () => {
      const finalAnswer =
        question?.type === "rating" ? String(ratingValue) : answer;

      // 1. Submit current answer
      await submitAnswer(
        session.sessionId,
        session.token,
        question!.question_id,
        finalAnswer
      );

      // 2. Fetch next question
      const next = await getNextQuestion(session.sessionId, session.token);
      return next;
    },
    onSuccess: (data) => {
      // Reset inputs
      setAnswer("");
      setRatingValue(0);

      const questionCount = data.questionCount ?? session.questionNumber;

      // TASK 5: Only end session when BOTH conditions are met:
      // 1. Backend says done === true
      // 2. We have answered at least MIN_QUESTIONS_BEFORE_EXIT questions
      if (data.done) {
        if (questionCount >= MIN_QUESTIONS_BEFORE_EXIT) {
          onComplete();
          return;
        }
        // Safety net: done=true but not enough questions answered.
        // Log a warning and try to continue.
        console.warn(
          `[QuestionPage] Backend sent done=true but only ${questionCount} questions answered (min: ${MIN_QUESTIONS_BEFORE_EXIT}). Requesting next question.`
        );
        // If there's still a next question in the response, use it
        if (data.nextQuestion) {
          const nextQ: Question = {
            question_id: data.nextQuestion.question_id!,
            text: data.nextQuestion.text || "",
            type: (data.nextQuestion.type as Question["type"]) || "open",
            options: data.nextQuestion.options,
          };
          onUpdateSession({
            ...session,
            currentQuestion: nextQ,
            questionNumber: session.questionNumber + 1,
          });
          return;
        }
        // No next question available — accept the end
        onComplete();
        return;
      }

      // Build the next question object from either the embedded nextQuestion
      // or the top-level fields (backward-compatible)
      const nextQ: Question = data.nextQuestion
        ? {
            question_id: data.nextQuestion.question_id!,
            text: data.nextQuestion.text || "",
            type: (data.nextQuestion.type as Question["type"]) || "open",
            options: data.nextQuestion.options,
          }
        : {
            question_id: data.question_id!,
            text: data.text || "",
            type: data.type || "open",
            options: data.options,
          };

      onUpdateSession({
        ...session,
        currentQuestion: nextQ,
        questionNumber: session.questionNumber + 1,
      });
    },
  });

  const canSubmit =
    question?.type === "rating"
      ? ratingValue > 0
      : answer.trim().length > 0;

  if (!question) return null;

  const options =
    question.options ?? MCQ_OPTIONS[question.question_id] ?? [];

  return (
    <div className="flex flex-col">
      <ProgressBar current={session.questionNumber} total={MAX_QUESTIONS} />

      {/* Question card */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm sm:p-8">
        {/* Type badge + AI indicator */}
        <div className="mb-4 flex items-center gap-2">
          {session.questionNumber > 3 ? (
            <span
              className="inline-block rounded-full px-3 py-1 text-xs font-medium"
              style={{
                background: "linear-gradient(135deg, rgba(20,184,166,0.15), rgba(139,92,246,0.15))",
                color: "#a5b4fc",
              }}
            >
              ✦ Personalised
            </span>
          ) : null}
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-medium
              ${question.type === "rating"
                ? "bg-amber-500/15 text-amber-300"
                : question.type === "mcq"
                  ? "bg-indigo-500/15 text-indigo-300"
                  : "bg-cyan-500/15 text-cyan-300"
              }`}
          >
            {question.type === "rating"
              ? "Rating"
              : question.type === "mcq"
                ? "Multiple Choice"
                : "Open Response"}
          </span>
          {session.questionNumber > 3 && (
            <span
              className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.25), rgba(20,184,166,0.25))",
                color: "#c4b5fd",
              }}
            >
              AI
            </span>
          )}
        </div>

        <h2 className="mb-6 text-lg font-semibold leading-relaxed text-slate-100 sm:text-xl">
          {question.text}
        </h2>

        {/* ── Rating input ──────────────────────────────── */}
        {question.type === "rating" && (
          <StarRating value={ratingValue} onChange={setRatingValue} />
        )}

        {/* ── MCQ input ─────────────────────────────────── */}
        {question.type === "mcq" && (
          <div className="flex flex-col gap-3">
            {options.map((opt) => (
              <label
                key={opt}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border
                  px-4 py-3 text-sm transition-all duration-200
                  ${answer === opt
                    ? "border-indigo-500/50 bg-indigo-500/10 text-slate-100"
                    : "border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-slate-200"
                  }`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full
                    border-2 transition-all
                    ${answer === opt
                      ? "border-indigo-400 bg-indigo-500"
                      : "border-slate-600"
                    }`}
                >
                  {answer === opt && (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>
                <input
                  type="radio"
                  name="mcq"
                  value={opt}
                  checked={answer === opt}
                  onChange={() => setAnswer(opt)}
                  className="sr-only"
                />
                {opt}
              </label>
            ))}
          </div>
        )}

        {/* ── Open text input ───────────────────────────── */}
        {question.type === "open" && (
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Share your thoughts…"
            rows={4}
            maxLength={5000}
            className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03]
              px-4 py-3 text-sm text-slate-100 placeholder-slate-600 outline-none
              transition-colors focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
          />
        )}
      </div>

      {/* Submit button */}
      <button
        onClick={() => mutation.mutate()}
        disabled={!canSubmit || mutation.isPending}
        className="mt-6 w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold
          transition-all duration-200 hover:bg-indigo-500 hover:shadow-lg
          hover:shadow-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-40
          disabled:hover:bg-indigo-600 disabled:hover:shadow-none active:scale-[0.98]"
      >
        {mutation.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30
              border-t-white" />
            Submitting…
          </span>
        ) : session.questionNumber >= MAX_QUESTIONS ? (
          "Submit & Finish"
        ) : (
          "Next Question"
        )}
      </button>

      {/* Error */}
      {mutation.isError && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3
          text-sm text-red-300">
          Failed to submit. Please try again.
        </div>
      )}
    </div>
  );
}
