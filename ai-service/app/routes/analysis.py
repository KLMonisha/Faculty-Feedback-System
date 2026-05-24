"""
Core AI endpoints:
  POST /next-question      — adaptive question selection
  POST /generate-insights  — Groq-powered theme extraction
  POST /generate-question  — dynamic AI question generation
"""

from fastapi import APIRouter, HTTPException

from app.models import (
    NextQuestionRequest,
    NextQuestionResponse,
    GenerateInsightsRequest,
    GenerateInsightsResponse,
    GenerateQuestionRequest,
    GenerateQuestionResponse,
)
from app.services.question_selector import select_next_question, QUESTIONS
from app.services.insight_generator import generate_insights
from services.llm import generate_dynamic_question

router = APIRouter()


# ─────────────────────────────────────────────────────────────
# POST /next-question
# ─────────────────────────────────────────────────────────────
@router.post("/next-question", response_model=NextQuestionResponse)
async def next_question(payload: NextQuestionRequest):
    """
    Adaptive question selection.

    Cold-start (no answers)  → decision-tree model
    Warm-start (has answers) → TF-IDF similarity scoring
    Done                     → after 5+ questions answered
    """
    next_qid = select_next_question(
        session_id=payload.session_id,
        concern_branch=payload.concern_branch,
        answers_so_far=payload.answers_so_far,
    )

    if next_qid is None:
        return NextQuestionResponse(done=True)

    # Verify the question exists in our catalogue
    if next_qid not in QUESTIONS:
        raise HTTPException(
            status_code=500,
            detail=f"Selected question '{next_qid}' not found in catalogue",
        )

    return NextQuestionResponse(next_question_id=next_qid, done=False)


# ─────────────────────────────────────────────────────────────
# POST /generate-insights
# ─────────────────────────────────────────────────────────────
@router.post("/generate-insights", response_model=GenerateInsightsResponse)
async def insights(payload: GenerateInsightsRequest):
    """
    Generate themes and suggestions from anonymised feedback.

    Requires a minimum of 5 response entries to produce meaningful insights.
    Calls Groq API (llama3-70b-8192) with a structured extraction prompt.
    """
    try:
        themes, suggestions = await generate_insights(payload.responses)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Insight generation failed: {exc}",
        ) from exc

    return GenerateInsightsResponse(themes=themes, suggestions=suggestions)


# ─────────────────────────────────────────────────────────────
# POST /generate-question
# ─────────────────────────────────────────────────────────────
@router.post("/generate-question", response_model=GenerateQuestionResponse)
async def generate_question(payload: GenerateQuestionRequest):
    """
    Generate a personalised follow-up question (Q4-Q7) using Groq LLM.

    Receives the full conversation history and generates the next
    question that builds on everything the student has said so far.
    """
    try:
        result = generate_dynamic_question(
            branch=payload.branch,
            answers_so_far=[entry.model_dump() for entry in payload.answers_so_far],
            question_number=payload.question_number,
            previously_generated_questions=payload.previously_generated_questions,
            last_question_type=payload.last_question_type,
        )
        return GenerateQuestionResponse(**result)
    except ValueError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Question generation failed: {exc}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Unexpected error during question generation: {exc}",
        ) from exc
