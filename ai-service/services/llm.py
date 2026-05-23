"""
Groq LLM integration for structured feedback insights.

Calls the Groq API (llama3-70b-8192) with a scoped system prompt and
returns parsed {themes, suggestions} or raises ValueError.
"""

from __future__ import annotations

import os
import json

from groq import Groq

# ─── Client ──────────────────────────────────────────────────
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

SYSTEM_PROMPT = (
    "You are an academic feedback analyst. "
    "Never reference individual students. "
    "Return only valid JSON."
)


def call_llm_for_insights(responses: list[dict], branch: str) -> dict:
    """
    Call Groq (llama3-70b-8192) to extract themes and suggestions
    from anonymised faculty feedback.

    Args:
        responses: List of dicts with "question" and "answer" keys.
        branch:    The concern branch (clarity, workload, assessment, support).

    Returns:
        A dict with two keys:
            - "themes":      list of 3 strings
            - "suggestions": list of 3 strings

    Raises:
        ValueError: If the LLM response cannot be parsed as valid JSON
                    with the expected structure.
    """
    groq_key = os.environ.get("GROQ_API_KEY")
    if not groq_key:
        raise ValueError(
            "GROQ_API_KEY is not configured. Set it in .env to enable LLM insights."
        )

    # Format responses as a numbered Q/A list
    qa_lines: list[str] = []
    for i, r in enumerate(responses, 1):
        question = r.get("question", r.get("question_id", f"Question {i}"))
        answer = r.get("answer", r.get("text", ""))
        qa_lines.append(f"{i}. Q: {question}\n   A: {answer}")

    qa_block = "\n".join(qa_lines)

    user_message = (
        f"Here are {len(responses)} anonymised student responses from the "
        f"'{branch}' feedback branch:\n\n"
        f"{qa_block}\n\n"
        "Analyse these responses and return a JSON object with exactly:\n"
        '- "themes": a list of 3 concise theme strings\n'
        '- "suggestions": a list of 3 actionable suggestion strings\n\n'
        "Return ONLY the JSON object, no explanation or markdown."
    )

    completion = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.3,
        max_tokens=500,
    )

    raw = completion.choices[0].message.content.strip()

    # ── Safe JSON parsing ────────────────────────────────────
    # Strip markdown fences if LLM wraps the response
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
    if raw.endswith("```"):
        raw = raw[: raw.rfind("```")]
    raw = raw.strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"LLM returned invalid JSON. Raw response:\n{raw}"
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
