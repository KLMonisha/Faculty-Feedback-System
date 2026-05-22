function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎓</span>
            <h1 className="text-xl font-bold tracking-tight">
              Faculty Feedback System
            </h1>
          </div>
          <nav className="flex items-center gap-4">
            <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Dashboard</a>
            <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Feedback</a>
            <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Analytics</a>
            <button className="ml-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 transition-colors">
              Sign In
            </button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-7xl px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-400/10 px-4 py-1.5 text-sm text-indigo-300 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
          </span>
          AI-Powered Analysis
        </div>

        <h2 className="text-5xl font-bold tracking-tight leading-tight mb-6">
          Transform Student Feedback
          <br />
          <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Into Actionable Insights
          </span>
        </h2>

        <p className="mx-auto max-w-2xl text-lg text-slate-400 mb-12">
          Collect, analyze, and visualize faculty feedback with AI-powered
          sentiment analysis. Make data-driven decisions to improve teaching
          quality across your institution.
        </p>

        <div className="flex items-center justify-center gap-4">
          <button className="rounded-lg bg-indigo-600 px-6 py-3 font-medium hover:bg-indigo-500 transition-all hover:shadow-lg hover:shadow-indigo-500/25">
            Get Started
          </button>
          <button className="rounded-lg border border-white/20 px-6 py-3 font-medium hover:bg-white/5 transition-all">
            View Demo
          </button>
        </div>

        {/* Stats */}
        <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            { label: "Feedback Entries", value: "10,000+", icon: "📝" },
            { label: "Faculty Members",  value: "500+",    icon: "👨‍🏫" },
            { label: "Accuracy Rate",    value: "96.5%",   icon: "🎯" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm hover:bg-white/10 transition-colors"
            >
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
