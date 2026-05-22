interface Props {
  children: React.ReactNode;
}

export default function Layout({ children }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4">
          <span className="text-2xl" aria-hidden>🎓</span>
          <span className="text-lg font-semibold tracking-tight">
            Faculty Feedback
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="flex flex-1 flex-col items-center px-5 py-10">
        <div className="w-full max-w-2xl">{children}</div>
      </main>

      {/* Privacy footer */}
      <footer className="border-t border-white/5 py-4 text-center text-xs text-slate-500">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 px-5">
          <svg
            className="h-3.5 w-3.5 text-emerald-500"
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
          Your responses are fully anonymised
        </div>
      </footer>
    </div>
  );
}
