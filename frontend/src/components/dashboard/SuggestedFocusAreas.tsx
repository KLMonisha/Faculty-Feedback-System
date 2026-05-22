import type { ThemeEntry } from "../../types";

interface Props {
  data: ThemeEntry[];
}

export default function SuggestedFocusAreas({ data }: Props) {
  // Collect all suggestions across branches
  const allSuggestions = data.flatMap((entry) =>
    entry.suggestions.map((s) => ({ text: s, branch: entry.branch }))
  );

  // Take the top 3
  const top3 = allSuggestions.slice(0, 3);

  if (top3.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="mb-1 text-base font-semibold text-slate-100">
          Suggested Focus Areas
        </h3>
        <p className="text-sm text-slate-500">
          AI-generated suggestions will appear here once enough data is collected.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="mb-5 flex items-center gap-2">
        <h3 className="text-base font-semibold text-slate-100">
          Suggested Focus Areas
        </h3>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px]
          font-semibold uppercase tracking-wider text-emerald-300">
          AI Generated
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {top3.map((item, i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-xl border border-emerald-500/20
              bg-emerald-500/[0.04] p-5 transition-colors hover:bg-emerald-500/[0.07]"
          >
            {/* Green accent bar */}
            <div className="absolute left-0 top-0 h-full w-1 bg-emerald-500/60" />

            <div className="pl-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg
                  bg-emerald-500/20 text-sm font-bold text-emerald-300">
                  {i + 1}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/70">
                  {item.branch}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-slate-200">
                {item.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
