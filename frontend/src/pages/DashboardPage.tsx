import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchInsights } from "../api/client";
import BranchDistributionChart from "../components/dashboard/BranchDistributionChart";
import RatingTrendChart from "../components/dashboard/RatingTrendChart";
import TopThemes from "../components/dashboard/TopThemes";
import SuggestedFocusAreas from "../components/dashboard/SuggestedFocusAreas";
import ExportPDFButton from "../components/dashboard/ExportPDFButton";

const TOKEN_KEY = "admin_token";

export default function DashboardPage() {
  const [tokenInput, setTokenInput] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");

  const {
    data: insights,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["insights", token],
    queryFn: () => fetchInsights(token),
    enabled: !!token,
    retry: false,
    staleTime: 60_000,
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    localStorage.setItem(TOKEN_KEY, tokenInput.trim());
    setToken(tokenInput.trim());
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setTokenInput("");
  };

  // ── Auth gate ──────────────────────────────────────────────
  if (!token) {
    return (
      <div className="flex flex-col items-center py-16">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl
          bg-indigo-500/15 ring-1 ring-indigo-500/30">
          <svg
            className="h-8 w-8 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25
                 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25
                 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-xl font-bold text-slate-100">
          Admin Dashboard
        </h2>
        <p className="mb-6 max-w-sm text-center text-sm text-slate-400">
          Enter your admin JWT token to access analytics and insights.
        </p>

        <form onSubmit={handleLogin} className="flex w-full max-w-sm flex-col gap-3">
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Paste admin JWT token…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3
              text-sm text-slate-100 placeholder-slate-600 outline-none transition-colors
              focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
          />
          <button
            type="submit"
            disabled={!tokenInput.trim()}
            className="rounded-xl bg-indigo-600 py-3 text-sm font-semibold transition-all
              hover:bg-indigo-500 disabled:opacity-40"
          >
            Access Dashboard
          </button>
        </form>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600
          border-t-indigo-400" />
        <p className="mt-4 text-sm text-slate-400">Loading dashboard…</p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────
  if (isError) {
    const status = (error as any)?.response?.status;
    return (
      <div className="flex flex-col items-center py-16">
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4
          text-sm text-red-300">
          {status === 401 || status === 403
            ? "Invalid or expired token. Please re-authenticate."
            : "Failed to load dashboard data. Check your connection and try again."}
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-slate-400 underline hover:text-slate-200"
        >
          Try a different token
        </button>
      </div>
    );
  }

  const d = insights!.data;

  // ── Dashboard ──────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">
            Analytics Dashboard
          </h2>
          <p className="text-sm text-slate-500">
            Aggregated insights across all feedback sessions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportPDFButton />
          <button
            onClick={handleLogout}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium
              text-slate-400 transition-colors hover:border-white/20 hover:text-slate-200
              print:hidden"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Sessions", value: d.overview.total_sessions },
          { label: "Completed", value: d.overview.completed_sessions },
          { label: "Responses", value: d.overview.total_responses },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center"
          >
            <p className="text-2xl font-bold text-slate-100">{s.value}</p>
            <p className="mt-1 text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BranchDistributionChart data={d.branch_distribution} />
        <RatingTrendChart data={d.rating_averages} />
      </div>

      {/* Themes */}
      <TopThemes data={d.themes} />

      {/* Suggestions */}
      <SuggestedFocusAreas data={d.themes} />

      {/* Footer note */}
      <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-4 py-3
        text-center text-xs text-amber-300/80">
        Minimum 5 responses required per branch before data is surfaced.
      </div>
    </div>
  );
}
