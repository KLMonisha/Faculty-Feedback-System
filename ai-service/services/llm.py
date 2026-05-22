"""
Claude LLM integration for structured feedback insights.

Calls the Anthropic API with a tightly scoped system prompt and
returns parsed {themes, suggestions} or raises ValueError.
"""

from __future__ import annotations

import json

import anthropic

from app.config import settings

# ─── Prompts ─────────────────────────────────────────────────
SYSTEM_PROMPT = (
    "You are an academic feedback analyst. You receive anonymised student feedback responses "
    "about a faculty member. Your job is to identify patterns and return structured, constructive "
    "insights. Never reference individual students. Always be specific and evidence-based."
)


def _build_user_prompt(responses: list[dict]) -> str:
    """Format the list of response dicts into the user prompt."""
    branch = responses[0].get("branch", "general") if responses else "general"
    n = len(responses)

    lines: list[str] = []
    for i, r in enumerate(responses, 1):
        answer = r.get("answer", r.get("text", ""))
        lines.append(f"{i}. {answer}")

    answers_block = "\n".join(lines)

    return (
        f"Here are {n} anonymised responses from the {branch} feedback branch:\n"
        f"{answers_block}\n\n"
        'Return JSON only with keys: themes (list of 3 strings) and suggestions (list of 3 strings).'
    )


# ─── Public API ──────────────────────────────────────────────
def call_claude_for_insights(responses: list[dict]) -> dict:
    """
    Call Claude to extract themes and suggestions from anonymised feedback.

    Args:
        responses: List of dicts, each containing at least an "answer" (or "text")
                   key and optionally a "branch" key.

    Returns:
        A dict with two keys:
            - "themes":      list of 3 strings
            - "suggestions": list of 3 strings

    Raises:
        ValueError: If the Claude response cannot be parsed as valid JSON
                    with the expected structure.
    """
    if not settings.claude_api_key:
        raise ValueError(
            "CLAUDE_API_KEY is not configured. Set it in .env to enable LLM insights."
        )

    client = anthropic.Anthropic(api_key=settings.claude_api_key)

    message = client.messages.create(
        model="claude-sonnet-4-5-20250514",
        max_tokens=500,
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": _build_user_prompt(responses)},
        ],
    )

    raw = message.content[0].text.strip()

    # ── Safe JSON parsing ────────────────────────────────────
    # Strip markdown fences if Claude wraps the response
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
    if raw.endswith("```"):
        raw = raw[: raw.rfind("```")]
    raw = raw.strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Claude returned invalid JSON. Raw response:\n{raw}"
        ) from exc

    # ── Structure validation ─────────────────────────────────
    if not isinstance(parsed, dict):
        raise ValueError(
            f"Expected a JSON object, got {type(parsed).__name__}. Raw response:\n{raw}"
        )

    themes = parsed.get("themes")
    suggestions = parsed.get("suggestions")

    if not isinstance(themes, list) or not isinstance(suggestions, list):
        raise ValueError(
            f"Missing or invalid 'themes'/'suggestions' keys. Raw response:\n{raw}"
        )

    return {
        "themes": [str(t) for t in themes[:3]],
        "suggestions": [str(s) for s in suggestions[:3]],
    }
