import { useState } from "react";
import Layout from "./components/Layout";
import WelcomePage from "./pages/WelcomePage";
import QuestionPage from "./pages/QuestionPage";
import ThankYouPage from "./pages/ThankYouPage";
import type { Page, SessionState } from "./types";

export default function App() {
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
    <Layout>
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
    </Layout>
  );
}
