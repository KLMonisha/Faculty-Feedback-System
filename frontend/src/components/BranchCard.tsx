import type { Branch } from "../types";

interface Props {
  branch: Branch;
  onSelect: (branchId: string) => void;
  disabled?: boolean;
}

export default function BranchCard({ branch, onSelect, disabled }: Props) {
  return (
    <button
      onClick={() => onSelect(branch.id)}
      disabled={disabled}
      className={`group relative w-full overflow-hidden rounded-2xl border border-white/10
        bg-white/[0.03] p-5 text-left backdrop-blur-sm transition-all duration-300
        hover:border-white/20 hover:bg-white/[0.06] hover:shadow-lg
        hover:shadow-${branch.color}-500/5 disabled:pointer-events-none disabled:opacity-50
        active:scale-[0.98]`}
    >
      {/* Glow dot */}
      <div
        className={`absolute -right-6 -top-6 h-24 w-24 rounded-full
          bg-${branch.color}-500/10 blur-2xl transition-all duration-500
          group-hover:bg-${branch.color}-500/20`}
      />

      <div className="relative">
        <span className="mb-3 inline-block text-2xl">{branch.icon}</span>
        <h3 className="mb-1 text-base font-semibold text-slate-100">
          {branch.label}
        </h3>
        <p className="text-sm leading-relaxed text-slate-400">
          {branch.description}
        </p>
      </div>

      {/* Arrow */}
      <div className="absolute bottom-5 right-5 text-slate-600 transition-all
        duration-300 group-hover:translate-x-1 group-hover:text-slate-400">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </div>
    </button>
  );
}
