import { useState, lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import WelcomePage from "./pages/WelcomePage";
import QuestionPage from "./pages/QuestionPage";
import ThankYouPage from "./pages/ThankYouPage";
import type { Page, SessionState } from "./types";

// Lazy-load dashboard (includes heavy Recharts bundle)
const DashboardPage = lazy(() => import("./pages/DashboardPage"));

function StudentFlow() {
  const [page, setPage] = useState<Page>("welcome");
  const [session, setSession] = useState<SessionState | null>(null);

  const handleSessionStart = (s: SessionState) => {
    setSession(s);
    setPage("question");
  };

  const handleComplete = () => {
    setPage("thankyou");
  };

  const handleRestart = () => {
    setSession(null);
    setPage("welcome");
  };

  return (
    <>
      {page === "welcome" && (
        <WelcomePage onSessionStart={handleSessionStart} />
      )}

      {page === "question" && session && (
        <QuestionPage
          session={session}
          onComplete={handleComplete}
          onUpdateSession={setSession}
        />
      )}

      {page === "thankyou" && (
        <ThankYouPage onRestart={handleRestart} />
      )}
    </>
  );
}

function DashboardFallback() {
  return (
    <div className="flex flex-col items-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600
        border-t-indigo-400" />
      <p className="mt-4 text-sm text-slate-400">Loading dashboard…</p>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<StudentFlow />} />
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<DashboardFallback />}>
              <DashboardPage />
            </Suspense>
          }
        />
      </Routes>
    </Layout>
  );
}
