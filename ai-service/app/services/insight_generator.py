"""
Insight generator -- delegates to services.llm for Groq LLM calls.

Takes an anonymised batch of responses and extracts themes + suggestions.
"""

from __future__ import annotations

from app.models import AnswerEntry
from app.services.question_selector import QUESTIONS
from services.llm import call_llm_for_insights


async def generate_insights(
    responses: list[AnswerEntry],
) -> tuple[list[str], list[str]]:
    """
    Extract themes and suggestions from anonymised feedback via Groq.

    Returns (themes, suggestions) -- both lists of strings.
    """
    # Build the dicts that call_llm_for_insights expects
    response_dicts: list[dict] = []
    branch = "general"
    for r in responses:
        q_info = QUESTIONS.get(r.question_id)
        if q_info:
            branch = q_info["branch"]
        response_dicts.append({
            "answer": r.answer,
            "branch": branch,
            "question": q_info["text"] if q_info else r.question_id,
        })

    try:
        result = call_llm_for_insights(response_dicts, branch)
        return (result["themes"], result["suggestions"])
    except ValueError as exc:
        # Surface the parsing error but don't crash the endpoint
        return (
            [f"Insight generation failed: {exc}"],
            ["Review the AI service logs for details."],
        )
