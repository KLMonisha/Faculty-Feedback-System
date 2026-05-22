"""Feedback analysis endpoints using Claude AI."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import anthropic

from app.config import settings

router = APIRouter()


# ─── Request / Response Models ───────────────────────────────
class FeedbackInput(BaseModel):
    """Input model for feedback analysis."""
    feedback_text: str
    faculty_name: str | None = None
    course_code: str | None = None


class SentimentResult(BaseModel):
    """Structured sentiment analysis result."""
    sentiment: str          # positive, negative, neutral, mixed
    confidence: float       # 0.0 – 1.0
    summary: str            # one-line summary
    key_themes: list[str]   # extracted themes
    suggestions: list[str]  # actionable suggestions


class AnalysisResponse(BaseModel):
    """Full analysis response."""
    success: bool
    data: SentimentResult | None = None
    error: str | None = None


# ─── Endpoints ───────────────────────────────────────────────
@router.post("/sentiment", response_model=AnalysisResponse)
async def analyze_sentiment(payload: FeedbackInput):
    """Analyze the sentiment and themes of faculty feedback using Claude."""

    if not settings.claude_api_key:
        raise HTTPException(
            status_code=503,
            detail="CLAUDE_API_KEY is not configured",
        )

    client = anthropic.Anthropic(api_key=settings.claude_api_key)

    prompt = f"""Analyze the following faculty feedback and return a JSON object with these fields:
- sentiment: one of "positive", "negative", "neutral", "mixed"
- confidence: a float between 0 and 1
- summary: a one-sentence summary
- key_themes: an array of key themes (max 5)
- suggestions: an array of actionable improvement suggestions (max 3)

Faculty: {payload.faculty_name or "Unknown"}
Course: {payload.course_code or "Unknown"}

Feedback:
\"\"\"{payload.feedback_text}\"\"\"

Return ONLY the JSON object, no markdown or explanation."""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )

        import json
        result = json.loads(message.content[0].text)

        return AnalysisResponse(
            success=True,
            data=SentimentResult(**result),
        )
    except Exception as e:
        return AnalysisResponse(
            success=False,
            error=str(e),
        )


@router.post("/batch")
async def analyze_batch(payloads: list[FeedbackInput]):
    """Analyze multiple feedback entries. Returns a list of results."""
    # TODO: Implement batch analysis with rate limiting
    raise HTTPException(status_code=501, detail="Batch analysis not yet implemented")
