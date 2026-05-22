"""
Adaptive question selector.

Cold-start  → Scikit-learn decision tree trained on synthetic data
Warm-start  → TF-IDF similarity between previous answers and remaining question texts
"""

from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path

import pandas as pd
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.config import settings
from app.models import AnswerEntry

# ─── Question catalogue ─────────────────────────────────────
# Mirrors the seed data in /db/schema/seed.sql
QUESTIONS: dict[str, dict] = {
    "clarity_01":     {"branch": "clarity",    "text": "How clearly does the instructor explain core concepts?",                 "type": "rating", "order": 1},
    "clarity_02":     {"branch": "clarity",    "text": "Which teaching aid is most effective in this course?",                    "type": "mcq",    "order": 2},
    "clarity_03":     {"branch": "clarity",    "text": "Describe a topic that you found difficult to follow and why.",            "type": "open",   "order": 3},
    "workload_01":    {"branch": "workload",   "text": "How manageable is the weekly workload for this course?",                  "type": "rating", "order": 1},
    "workload_02":    {"branch": "workload",   "text": "Which component contributes the most to your workload?",                  "type": "mcq",    "order": 2},
    "workload_03":    {"branch": "workload",   "text": "What changes would make the workload more balanced?",                     "type": "open",   "order": 3},
    "assessment_01":  {"branch": "assessment", "text": "How fair and transparent is the grading in this course?",                 "type": "rating", "order": 1},
    "assessment_02":  {"branch": "assessment", "text": "Which assessment format do you find most useful for learning?",           "type": "mcq",    "order": 2},
    "assessment_03":  {"branch": "assessment", "text": "How could the assessment structure be improved?",                         "type": "open",   "order": 3},
    "support_01":     {"branch": "support",    "text": "How accessible is the instructor outside of class hours?",                "type": "rating", "order": 1},
    "support_02":     {"branch": "support",    "text": "Which support channel do you use the most?",                              "type": "mcq",    "order": 2},
    "support_03":     {"branch": "support",    "text": "What additional support would help you succeed in this course?",          "type": "open",   "order": 3},
}


# ─── Decision-tree cold-start model ─────────────────────────
class ColdStartModel:
    """
    Trained once at import time on synthetic_responses.csv.
    Predicts the best first question given (concern_branch, time_of_semester,
    engagement_hint).
    """

    def __init__(self) -> None:
        self.tree = DecisionTreeClassifier(max_depth=5, random_state=42)
        self.branch_enc = LabelEncoder()
        self.time_enc = LabelEncoder()
        self.engage_enc = LabelEncoder()
        self.label_enc = LabelEncoder()
        self._trained = False
        self._train()

    def _train(self) -> None:
        csv_path = Path(__file__).resolve().parents[2] / "data" / "synthetic_responses.csv"
        if not csv_path.exists():
            print(f"[WARN] Training data not found at {csv_path} -- cold-start disabled")
            return

        df = pd.read_csv(csv_path)

        X = pd.DataFrame({
            "branch":     self.branch_enc.fit_transform(df["concern_branch"]),
            "time":       self.time_enc.fit_transform(df["time_of_semester"]),
            "engagement": self.engage_enc.fit_transform(df["engagement_hint"]),
        })
        y = self.label_enc.fit_transform(df["best_first_question"])

        self.tree.fit(X, y)
        self._trained = True
        print(f"[OK] Cold-start decision tree trained on {len(df)} samples")

    def predict_first_question(self, concern_branch: str) -> str | None:
        """Predict the best first question for a branch."""
        if not self._trained:
            return None

        # Default context for cold-start (mid-semester, medium engagement)
        now = datetime.now()
        month = now.month
        if month in (1, 2, 8, 9):
            time_hint = "early"
        elif month in (5, 6, 11, 12):
            time_hint = "late"
        else:
            time_hint = "mid"

        try:
            branch_val = self.branch_enc.transform([concern_branch])[0]
            time_val = self.time_enc.transform([time_hint])[0]
            engage_val = self.engage_enc.transform(["medium"])[0]
        except ValueError:
            return None

        X_pred = pd.DataFrame(
            [{"branch": branch_val, "time": time_val, "engagement": engage_val}]
        )
        pred = self.tree.predict(X_pred)[0]
        return str(self.label_enc.inverse_transform([pred])[0])


# Singleton — trained once at module load
cold_start_model = ColdStartModel()


# ─── TF-IDF warm-start scorer ───────────────────────────────
class WarmStartScorer:
    """
    Ranks remaining questions by TF-IDF cosine similarity to the
    concatenation of previous answers.  Picks the LEAST similar
    remaining question to maximise coverage.
    """

    def __init__(self) -> None:
        self.vectorizer = TfidfVectorizer(stop_words="english")

    def pick_next(
        self,
        concern_branch: str,
        answers_so_far: list[AnswerEntry],
        answered_ids: set[str],
    ) -> str | None:
        # Remaining questions in this branch
        remaining = {
            qid: q
            for qid, q in QUESTIONS.items()
            if q["branch"] == concern_branch and qid not in answered_ids
        }
        if not remaining:
            return None

        # Build corpus: previous answers concatenated, then each remaining question text
        answer_blob = " ".join(a.answer for a in answers_so_far)
        question_texts = list(remaining.values())
        question_ids = list(remaining.keys())

        corpus = [answer_blob] + [q["text"] for q in question_texts]

        tfidf_matrix = self.vectorizer.fit_transform(corpus)
        similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]

        # Pick the LEAST similar question to maximise information coverage
        least_similar_idx = similarities.argmin()
        return question_ids[least_similar_idx]


warm_start_scorer = WarmStartScorer()


# ─── Public API ──────────────────────────────────────────────
def select_next_question(
    session_id: str,
    concern_branch: str,
    answers_so_far: list[AnswerEntry],
) -> str | None:
    """
    Select the next question adaptively.

    Returns a question_id or None if the session should end.
    """
    answered_ids = {a.question_id for a in answers_so_far}

    # Session complete after max questions
    if len(answered_ids) >= settings.max_questions_per_session:
        return None

    # No remaining questions in this branch
    branch_questions = {
        qid for qid, q in QUESTIONS.items() if q["branch"] == concern_branch
    }
    remaining = branch_questions - answered_ids
    if not remaining:
        return None

    # Cold start — no answers yet
    if not answers_so_far:
        predicted = cold_start_model.predict_first_question(concern_branch)
        if predicted and predicted in remaining:
            return predicted
        # Fallback: first by order
        return _first_by_order(concern_branch, answered_ids)

    # Warm start — use TF-IDF
    picked = warm_start_scorer.pick_next(concern_branch, answers_so_far, answered_ids)
    if picked:
        return picked

    # Final fallback
    return _first_by_order(concern_branch, answered_ids)


def _first_by_order(concern_branch: str, answered_ids: set[str]) -> str | None:
    """Fallback: next unanswered question in static order."""
    candidates = [
        (qid, q["order"])
        for qid, q in QUESTIONS.items()
        if q["branch"] == concern_branch and qid not in answered_ids
    ]
    if not candidates:
        return None
    candidates.sort(key=lambda x: x[1])
    return candidates[0][0]
