interface Props {
  onRestart: () => void;
}

export default function ThankYouPage({ onRestart }: Props) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      {/* Checkmark */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full
        bg-emerald-500/15 ring-1 ring-emerald-500/30">
        <svg
          className="h-10 w-10 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      </div>

      <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
        Thank you!
      </h2>

      <p className="mx-auto mb-2 max-w-sm text-base text-slate-400">
        Your feedback has been submitted anonymously.
      </p>

      <p className="mx-auto mb-8 max-w-sm text-sm text-slate-500">
        Your responses will help improve the teaching experience
        for everyone. No personal information was collected.
      </p>

      {/* Restart */}
      <button
        onClick={onRestart}
        className="rounded-xl border border-white/10 px-6 py-3 text-sm font-medium
          text-slate-300 transition-all duration-200 hover:border-white/20
          hover:bg-white/5 hover:text-white active:scale-[0.98]"
      >
        Submit Another Response
      </button>
    </div>
  );
}
