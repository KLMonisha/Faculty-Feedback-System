import type { ThemeEntry } from "../../types";

const BRANCH_COLORS: Record<string, string> = {
  clarity: "bg-indigo-500/15 text-indigo-300",
  workload: "bg-cyan-500/15 text-cyan-300",
  assessment: "bg-violet-500/15 text-violet-300",
  support: "bg-emerald-500/15 text-emerald-300",
};

interface Props {
  data: ThemeEntry[];
}

export default function TopThemes({ data }: Props) {
  // Flatten all themes with their branch tag
  const allThemes = data.flatMap((entry) =>
    entry.themes.map((theme) => ({
      theme,
      branch: entry.branch,
    }))
  );

  if (allThemes.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="mb-1 text-base font-semibold text-slate-100">
          Top Themes
        </h3>
        <p className="text-sm text-slate-500">
          No themes extracted yet. Themes appear after at least 5 responses per branch.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h3 className="mb-1 text-base font-semibold text-slate-100">
        Top Themes
      </h3>
      <p className="mb-5 text-xs text-slate-500">
        LLM-extracted patterns from open-ended responses
      </p>

      <div className="flex flex-col gap-3">
        {allThemes.map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-xl border border-white/5
              bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.04]"
          >
            {/* Number badge */}
            <span className="flex h-6 w-6 shrink-0 items-center justify-center
              rounded-full bg-white/10 text-xs font-semibold text-slate-300">
              {i + 1}
            </span>

            <div className="flex-1">
              <p className="text-sm leading-relaxed text-slate-200">
                {item.theme}
              </p>
            </div>

            {/* Branch tag */}
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider
                ${BRANCH_COLORS[item.branch] || "bg-slate-500/15 text-slate-300"}`}
            >
              {item.branch}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
