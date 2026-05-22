import { useMutation } from "@tanstack/react-query";
import { startSession } from "../api/client";
import BranchCard from "../components/BranchCard";
import type { Branch, SessionState } from "../types";

const BRANCHES: Branch[] = [
  {
    id: "clarity",
    label: "Clarity & Explanation",
    description: "How well concepts are communicated and whether teaching methods support understanding.",
    icon: "💡",
    color: "indigo",
  },
  {
    id: "workload",
    label: "Workload & Pacing",
    description: "Whether the course workload is manageable and the pacing allows for deep learning.",
    icon: "📚",
    color: "cyan",
  },
  {
    id: "assessment",
    label: "Assessment Fairness",
    description: "How fair, transparent, and constructive the grading and evaluation process is.",
    icon: "📝",
    color: "violet",
  },
  {
    id: "support",
    label: "Support & Access",
    description: "How accessible the instructor is and what support channels are available to students.",
    icon: "🤝",
    color: "emerald",
  },
];

interface Props {
  onSessionStart: (session: SessionState) => void;
}

export default function WelcomePage({ onSessionStart }: Props) {
  const mutation = useMutation({
    mutationFn: startSession,
    onSuccess: (data, branchId) => {
      onSessionStart({
        sessionId: data.session_id,
        token: data.token,
        concernBranch: branchId,
        currentQuestion: data.first_question,
        questionNumber: 1,
      });
    },
  });

  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <div className="mb-10 text-center">
        <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Faculty Feedback System
        </h1>
        <p className="mx-auto max-w-md text-base text-slate-400">
          Help improve teaching quality by sharing your honest experience.
          Choose a topic below to begin.
        </p>
      </div>

      {/* Privacy banner */}
      <div className="mb-8 flex items-center gap-2.5 rounded-full border border-emerald-500/20
        bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
        <svg
          className="h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598
               6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623
               5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152
               c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </svg>
        Fully anonymous — no login, no tracking
      </div>

      {/* Branch cards */}
      <div className="grid w-full gap-4 sm:grid-cols-2">
        {BRANCHES.map((branch) => (
          <BranchCard
            key={branch.id}
            branch={branch}
            onSelect={(id) => mutation.mutate(id)}
            disabled={mutation.isPending}
          />
        ))}
      </div>

      {/* Error */}
      {mutation.isError && (
        <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3
          text-sm text-red-300">
          Something went wrong. Please try again.
        </div>
      )}

      {/* Loading */}
      {mutation.isPending && (
        <div className="mt-6 flex items-center gap-2 text-sm text-slate-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500
            border-t-indigo-400" />
          Starting your session…
        </div>
      )}
    </div>
  );
}
