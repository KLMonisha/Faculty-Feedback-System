"""
Groq LLM integration for structured feedback insights
and dynamic adaptive question generation.

Calls the Groq API (llama3-70b-8192) with scoped system prompts.
"""

from __future__ import annotations

import os
import json
import traceback

from groq import Groq

# ─── Client (lazy-init) ──────────────────────────────────────
_client: Groq | None = None


def _get_client() -> Groq:
    """Return the Groq client, creating it on first use."""
    global _client
    if _client is None:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise ValueError(
                "GROQ_API_KEY is not configured. Set it in .env to enable LLM insights."
            )
        _client = Groq(api_key=api_key)
    return _client


INSIGHT_SYSTEM_PROMPT = (
    "You are an academic feedback analyst. "
    "Never reference individual students. "
    "Return only valid JSON."
)


def call_llm_for_insights(responses: list[dict], branch: str) -> dict:
    """
    Call Groq (llama3-70b-8192) to extract themes and suggestions
    from anonymised faculty feedback.

    Accepts both static Q&A and AI-generated personalised follow-ups.

    Args:
        responses: List of dicts with "question" and "answer" keys.
        branch:    The concern branch.

    Returns:
        A dict with "themes" (list[str]) and "suggestions" (list[str]).

    Raises:
        ValueError: If the LLM response cannot be parsed as valid JSON
                    with the expected structure.
    """
    groq = _get_client()

    # Separate static vs AI-generated for clearer transcript
    static_lines: list[str] = []
    ai_lines: list[str] = []
    for i, r in enumerate(responses, 1):
        question = r.get("question", r.get("question_id", f"Question {i}"))
        answer = r.get("answer", r.get("text", ""))
        is_ai = r.get("is_ai_generated", False)
        line = f"Q{i}: {question} → {answer}"
        if is_ai:
            ai_lines.append(line)
        else:
            static_lines.append(line)

    transcript = (
        f"Here is a full anonymised student feedback conversation "
        f"about the '{branch}' category:\n\n"
    )
    if static_lines:
        transcript += "[Static questions]\n" + "\n".join(static_lines) + "\n\n"
    if ai_lines:
        transcript += (
            "[Personalised follow-ups — student-driven]\n"
            + "\n".join(ai_lines) + "\n\n"
        )

    user_message = (
        transcript
        + "Based on this full conversation, identify:\n"
        "1. The 3 most important themes (be specific, reference what the student said)\n"
        "2. 3 concrete, actionable suggestions for the faculty member\n"
        'Return ONLY JSON: { "themes": [], "suggestions": [] }'
    )

    completion = groq.chat.completions.create(
        model="llama3-70b-8192",
        messages=[
            {"role": "system", "content": INSIGHT_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.3,
        max_tokens=500,
    )

    raw = completion.choices[0].message.content.strip()

    # ── Safe JSON parsing ────────────────────────────────────
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


# ─── Dynamic Question Generation ────────────────────────────

def generate_dynamic_question(
    branch: str,
    answers_so_far: list[dict],
    question_number: int,
    previously_generated_questions: list[str],
    last_question_type: str = "",
) -> dict:
    """
    Generate a personalised follow-up question using Groq LLM.

    Args:
        branch:                        The concern branch.
        answers_so_far:                Full Q&A history [{question_text, answer, type}, ...].
        question_number:               Which question this is (4-7).
        previously_generated_questions: Texts of all previously generated questions.
        last_question_type:            Type of the last answered question.

    Returns:
        {"text": str, "type": "open" | "mcq", "options": list[str] | None}
    """
    groq = _get_client()

    # Build the conversation transcript
    qa_lines: list[str] = []
    for i, entry in enumerate(answers_so_far, 1):
        q_text = entry.get("question_text", f"Question {i}")
        answer = entry.get("answer", "")
        qa_lines.append(f"Q{i}: {q_text}\nA{i}: {answer}")

    qa_block = "\n\n".join(qa_lines)

    # Build the list of previously asked question texts
    all_prev_questions = []
    for entry in answers_so_far:
        all_prev_questions.append(entry.get("question_text", ""))
    all_prev_questions.extend(previously_generated_questions)
    prev_list = "\n".join(f"- {q}" for q in all_prev_questions if q)

    # Smart type selection
    type_constraint = ""
    if last_question_type == "open":
        type_constraint = (
            "\n\nIMPORTANT: This question MUST be type 'mcq' with exactly "
            "4 options derived from themes in the student's answers. "
            "Do NOT make it an open-ended question."
        )

    # Closing question logic
    closing_instruction = ""
    if question_number >= 7:
        closing_instruction = (
            f"\n\nThis is the FINAL question (question {question_number} of 7). "
            f"Ask a gentle closing question like 'Is there anything else about {branch} "
            f"you would like the faculty to know?' — make it feel like a natural "
            f"conversation closer."
        )

    system_prompt = (
        f"You are an adaptive academic feedback assistant conducting a "
        f"personalised feedback session about a faculty member.\n"
        f"You have been having a conversation with a student about {branch}.\n"
        f"Your job is to ask the next most relevant follow-up question.\n\n"
        f"Rules:\n"
        f"- Build directly on what the student has said — reference their "
        f"specific words or concerns where natural\n"
        f"- Never repeat a question already asked (list provided below)\n"
        f"- Vary the depth: early follow-ups should dig deeper into specific "
        f"problems, later ones should broaden to solutions or comparisons\n"
        f"- Question {question_number} of 7\n"
        f"- Keep questions concise — one sentence max\n"
        f"- Return ONLY JSON with keys 'text' (string) and 'type' ('open' or 'mcq')\n"
        f"- If type is mcq, also return 'options' (list of 4 strings derived "
        f"from themes in the student's answers — not generic options)\n\n"
        f"Previously asked questions (do not repeat):\n{prev_list}"
        f"{type_constraint}"
        f"{closing_instruction}"
    )

    user_message = (
        f"Here is the full conversation so far:\n\n"
        f"{qa_block}\n\n"
        f"Generate question number {question_number}."
    )

    print(
        f"[DynamicFlow] Generating Q{question_number} for branch '{branch}' "
        f"with {len(answers_so_far)} prior answers"
    )

    completion = groq.chat.completions.create(
        model="llama3-70b-8192",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        temperature=0.6,
        max_tokens=300,
    )

    raw = completion.choices[0].message.content.strip()

    # ── Safe JSON parsing ────────────────────────────────────
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
    if raw.endswith("```"):
        raw = raw[: raw.rfind("```")]
    raw = raw.strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(f"[DynamicFlow] Failed to parse LLM JSON: {raw}")
        raise ValueError(f"LLM returned invalid JSON: {raw}") from exc

    text = parsed.get("text", "").strip()
    q_type = parsed.get("type", "open").strip().lower()
    options = parsed.get("options")

    if not text:
        raise ValueError("LLM returned empty question text")

    # Validate type
    if q_type not in ("open", "mcq"):
        q_type = "open"
        options = None

    # If MCQ, validate options
    if q_type == "mcq":
        if not isinstance(options, list) or len(options) < 2:
            # Fallback to open if options are invalid
            q_type = "open"
            options = None
        else:
            options = [str(o).strip() for o in options[:4]]

    result = {"text": text, "type": q_type}
    if options:
        result["options"] = options

    print(
        f"[DynamicFlow] Generated Q{question_number}: "
        f"type={q_type}, text='{text[:60]}...'"
    )
    return result
