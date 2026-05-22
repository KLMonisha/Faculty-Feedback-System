"""
Insight generator using Claude API.

Takes an anonymised batch of responses and extracts themes + suggestions.
"""

from __future__ import annotations

import json

import anthropic

from app.config import settings
from app.models import AnswerEntry
from app.services.question_selector import QUESTIONS


async def generate_insights(
    responses: list[AnswerEntry],
) -> tuple[list[str], list[str]]:
    """
    Call Claude to extract themes and suggestions from anonymised feedback.

    Returns (themes, suggestions) — both lists of strings.
    """
    if not settings.claude_api_key:
        return (
            ["(Claude API key not configured)"],
            ["Configure CLAUDE_API_KEY in .env to enable AI insights."],
        )

    # Build a readable block of anonymised answers
    response_block = _format_responses(responses)

    prompt = f"""You are an educational analyst. Below is a batch of anonymised student
feedback responses about their faculty experience. Each response is labelled
with the question it answered.

─── ANONYMISED RESPONSES ───
{response_block}
─── END RESPONSES ───

Analyse these responses and return a JSON object with EXACTLY this shape:
{{
  "themes": ["<theme 1>", "<theme 2>", "<theme 3>"],
  "suggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"]
}}

Rules:
1. Extract the top 3 recurring themes across all responses.
2. Generate 3 actionable, specific suggestions for the faculty member.
3. Never mention individual students or identify anyone.
4. Keep each theme and suggestion under 30 words.
5. Return ONLY the JSON object — no markdown, no explanation."""

    client = anthropic.Anthropic(api_key=settings.claude_api_key)

    message = client.messages.create(
        model=settings.claude_model,
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()

    try:
        parsed = json.loads(raw)
        themes = parsed.get("themes", [])[:3]
        suggestions = parsed.get("suggestions", [])[:3]
        return (themes, suggestions)
    except (json.JSONDecodeError, KeyError, IndexError):
        # If Claude returns malformed JSON, return the raw text as a single theme
        return ([raw[:200]], ["Review the raw AI output for insights."])


def _format_responses(responses: list[AnswerEntry]) -> str:
    """Format responses into a readable block for the prompt."""
    lines: list[str] = []
    for i, r in enumerate(responses, 1):
        q_info = QUESTIONS.get(r.question_id)
        q_text = q_info["text"] if q_info else r.question_id
        lines.append(f"[{i}] Q: {q_text}")
        lines.append(f"    A: {r.answer}")
        lines.append("")
    return "\n".join(lines)
