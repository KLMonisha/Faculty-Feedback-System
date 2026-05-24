"""Pydantic models for request/response validation."""

from pydantic import BaseModel, Field


# ─── Shared ──────────────────────────────────────────────────
class AnswerEntry(BaseModel):
    """A single question+answer pair."""
    question_id: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=1)


# ─── POST /next-question ────────────────────────────────────
class NextQuestionRequest(BaseModel):
    """Input for adaptive question selection."""
    session_id: str = Field(..., min_length=1)
    concern_branch: str = Field(..., pattern=r"^(clarity|workload|assessment|support)$")
    answers_so_far: list[AnswerEntry] = Field(default_factory=list)


class NextQuestionResponse(BaseModel):
    """Returned question or done signal."""
    next_question_id: str | None = None
    done: bool = False


# ─── POST /generate-insights ────────────────────────────────
class GenerateInsightsRequest(BaseModel):
    """Anonymised batch of responses for theme extraction."""
    responses: list[AnswerEntry] = Field(..., min_length=5)


class GenerateInsightsResponse(BaseModel):
    """Extracted themes and suggestions."""
    themes: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)


# ─── POST /generate-question ────────────────────────────────
class QAHistoryEntry(BaseModel):
    """A single Q&A pair with full text for context."""
    question_text: str
    answer: str
    type: str = "open"


class GenerateQuestionRequest(BaseModel):
    """Input for dynamic AI question generation."""
    branch: str = Field(..., pattern=r"^(clarity|workload|assessment|support)$")
    answers_so_far: list[QAHistoryEntry] = Field(default_factory=list)
    question_number: int = Field(..., ge=4, le=7)
    previously_generated_questions: list[str] = Field(default_factory=list)
    last_question_type: str = Field(default="")


class GenerateQuestionResponse(BaseModel):
    """A dynamically generated question."""
    text: str
    type: str = "open"
    options: list[str] | None = None
