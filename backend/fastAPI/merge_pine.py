import random
from typing import List, Dict, Any

from quiz_api import (
    QUESTION_TYPES,
    build_question_item,
    extract_key_answers,
    split_contexts,
    generate_questions_from_context,
    is_bad_answer,
)


def _dedupe_questions(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Remove duplicate questions by (type, question) pair while keeping order."""
    seen = set()
    unique = []

    for q in questions:
        key = (q.get("type"), q.get("question"))
        if key in seen:
            continue
        if not q.get("question"):
            continue
        unique.append(q)
        seen.add(key)

    return unique


def _generate_missing_type(
    q_type: str,
    contexts: List[str],
    answers_cache: Dict[str, List[str]],
    target_per_context: int = 6,
) -> Dict[str, Any] | None:
    """Try to synthesize a question of the requested type from provided contexts."""
    for ctx in contexts:
        if ctx not in answers_cache:
            answers_cache[ctx] = extract_key_answers(ctx, max_answers=target_per_context)

        answers = answers_cache[ctx][:]
        random.shuffle(answers)

        for ans in answers:
            if is_bad_answer(ans):
                continue

            item = build_question_item(ctx, ans, q_type)
            if item:
                return item

    return None


def _placeholder_item(q_type: str, context: str) -> Dict[str, Any]:
    """Fallback item to guarantee all three types are present."""
    placeholder = (context.split() or ["the topic"])[0]
    if q_type == "cloze":
        return {
            "context": context,
            "type": "cloze",
            "question": f"In the passage, ____ refers to {placeholder}.",
            "answer": placeholder,
        }
    if q_type == "mcq":
        choices = [placeholder, "Not specified", "Unknown", "Cannot be determined"]
        return {
            "context": context,
            "type": "mcq",
            "question": f"What does the text mention about {placeholder}?",
            "answer": placeholder,
            "choices": choices,
            "answer_index": 0,
        }
    return {
        "context": context,
        "type": "short",
        "question": f"What is {placeholder}?",
        "answer": placeholder,
    }


def enforce_question_mix(
    questions: List[Dict[str, Any]],
    contexts: List[str],
    target_total: int,
) -> List[Dict[str, Any]]:
    """Ensure at least one short, one cloze, and one mcq question."""
    target_total = max(target_total, len(QUESTION_TYPES))
    contexts = contexts or [""]
    base_context = contexts[0]

    questions = _dedupe_questions(questions)
    answers_cache: Dict[str, List[str]] = {}

    picked: List[Dict[str, Any]] = []
    has_type = {qt: False for qt in QUESTION_TYPES}

    # Prioritize covering each type
    for q in questions:
        if all(has_type.values()):
            break
        q_type = q.get("type")
        if q_type in has_type and not has_type[q_type]:
            picked.append(q)
            has_type[q_type] = True

    # Generate missing types if any
    for q_type, present in has_type.items():
        if present:
            continue
        generated = _generate_missing_type(q_type, contexts, answers_cache)
        if generated:
            picked.append(generated)
            has_type[q_type] = True

    # Final fallback placeholders for missing types
    for q_type, present in has_type.items():
        if present:
            continue
        picked.append(_placeholder_item(q_type, base_context))
        has_type[q_type] = True

    # Fill the rest up to target_total
    remaining = [q for q in questions if q not in picked]
    for q in remaining:
        if len(picked) >= target_total:
            break
        picked.append(q)

    # If still short, generate extras from contexts
    ctx_idx = 0
    while len(picked) < target_total and ctx_idx < len(contexts):
        ctx = contexts[ctx_idx]
        answers = answers_cache.get(ctx)
        if not answers:
            answers = extract_key_answers(ctx, max_answers=target_total * 2)
            answers_cache[ctx] = answers
        random.shuffle(answers)

        for ans in answers:
            if len(picked) >= target_total:
                break
            if is_bad_answer(ans):
                continue
            q_type = random.choice(QUESTION_TYPES)
            item = build_question_item(ctx, ans, q_type)
            if item:
                picked.append(item)

        ctx_idx += 1

    return picked[:target_total]


def generate_questions(text: str, top_n: int = 4) -> List[Dict[str, Any]]:
    """
    Generate quiz questions from text and enforce a mix of short, cloze, and mcq.
    """
    try:
        target_total = max(int(top_n), len(QUESTION_TYPES))
    except (TypeError, ValueError):
        target_total = len(QUESTION_TYPES)

    contexts = split_contexts(text, max_words=150)
    if not contexts:
        return []

    collected: List[Dict[str, Any]] = []
    for ctx in contexts:
        collected.extend(
            generate_questions_from_context(ctx, max_questions_per_context=3)
        )
        if len(collected) >= target_total * 2:
            break

    return enforce_question_mix(collected, contexts, target_total)
