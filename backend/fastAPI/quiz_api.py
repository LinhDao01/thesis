import torch
import random
import re
import spacy
import nltk
from nltk.tokenize import sent_tokenize
from transformers import T5Tokenizer, T5ForConditionalGeneration
from sentence_transformers import SentenceTransformer, util

# Set NLTK data path to use existing wordnet data
nltk_data_path = r"C:\Users\MSIGF63\AppData\Roaming\nltk_data"
if nltk_data_path not in nltk.data.path:
    nltk.data.path.insert(0, nltk_data_path)

# Download punkt if needed (for tokenization)
nltk.download("punkt", quiet=True)

# Import wordnet after setting the path
from nltk.corpus import wordnet as wn

device = "cuda" if torch.cuda.is_available() else "cpu"

# =========================
# Load models
# =========================

# QAG model (FINETUNED)
QAG_MODEL_PATH = "E:\code\backend\fastAPI\flan-t5-large"
qag_tokenizer = T5Tokenizer.from_pretrained("./flan-t5-large")
qag_model = T5ForConditionalGeneration.from_pretrained(QAG_MODEL_PATH).to(device)
qag_model.eval()

# Distractor model (BASE)
dist_tokenizer = T5Tokenizer.from_pretrained("google/flan-t5-large")
dist_model = T5ForConditionalGeneration.from_pretrained("google/flan-t5-large").to(device)
dist_model.eval()

# NLP tools
nlp = spacy.load("en_core_web_sm")
sbert = SentenceTransformer("all-MiniLM-L6-v2")


def clean_question(text: str) -> str:
    cleaned = re.sub(r"\s+", " ", text or "").strip()
    if cleaned and not cleaned.endswith("?"):
        cleaned += "?"
    return cleaned


def extract_key_answers(context, max_answers=5):
    doc = nlp(context)
    answers = []

    for ent in doc.ents:
        if ent.label_ in ["PERSON", "GPE", "ORG", "DATE", "CARDINAL", "EVENT"]:
            if 1 <= len(ent.text.split()) <= 3:
                answers.append(ent.text)

    # fallback noun chunks
    if len(answers) < max_answers:
        for chunk in doc.noun_chunks:
            if 1 <= len(chunk.text.split()) <= 3:
                answers.append(chunk.text)

    # unique & ordered
    seen = set()
    final = []
    for a in answers:
        if a.lower() not in seen:
            final.append(a)
            seen.add(a.lower())

    return final[:max_answers]


def generate_question(context: str, answer: str, q_type: str = "short") -> str:
    prompt_templates = {
        "short": (
            "Create a concise question that can be answered with the given answer. "
            "Keep it direct and grounded in the context.\n"
            f"Context: {context}\nAnswer: {answer}\nQuestion:"
        ),
        "cloze": (
            "Write a fill-in-the-blank question by removing the answer from a key sentence. "
            "Use '____' for the blank.\n"
            f"Context: {context}\nAnswer to hide: {answer}\nCloze question:"
        ),
        "mcq": (
            "Generate the stem for a multiple-choice question using the context and answer. "
            "Only return the question text (no choices).\n"
            f"Context: {context}\nCorrect answer: {answer}\nQuestion:"
        ),
    }

    prompt = prompt_templates.get(q_type, prompt_templates["short"])
    inputs = qag_tokenizer(
        prompt,
        return_tensors="pt",
        truncation=True,
        max_length=512,
        padding=True,
    ).to(device)

    with torch.no_grad():
        outputs = qag_model.generate(
            **inputs,
            max_new_tokens=64,
            num_beams=4,
            do_sample=True,
            top_p=0.9,
            temperature=0.9,
            repetition_penalty=1.1,
        )

    decoded = qag_tokenizer.decode(outputs[0], skip_special_tokens=True)
    return clean_question(decoded) or f"What is {answer}?"


def is_bad_answer(ans: str) -> bool:
    ans = ans.lower()

    # Email
    if re.search(r"[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}", ans):
        return True

    # Metadata words
    banned = [
        "introduction", "author", "student",
        "supervisor", "email", "university"
    ]
    if any(b in ans for b in banned):
        return True

    return False


QUESTION_TYPES = ["short", "cloze", "mcq"]

def build_question_item(context: str, answer: str, q_type: str):
    if not answer or is_bad_answer(answer):
        return None

    answer_clean = answer.strip()
    if q_type == "cloze":
        cloze = generate_cloze(context, answer_clean)
        if not cloze:
            cloze = f"In the context above, ____ refers to {answer_clean}."
        return {
            "context": context,
            "type": "cloze",
            "question": cloze,
            "answer": answer_clean,
        }

    question_text = generate_question(context, answer_clean, q_type)
    item = {
        "context": context,
        "type": q_type,
        "question": question_text,
        "answer": answer_clean,
    }

    if q_type == "mcq":
        distractors = generate_distractors(
            context,
            question_text,
            answer_clean,
            k=3,
        )
        choices = [answer_clean] + distractors
        random.shuffle(choices)
        item["choices"] = choices
        item["distractors"] = distractors
        item["answer_index"] = (
            choices.index(answer_clean) if answer_clean in choices else 0
        )

    return item


def generate_questions_from_context(
    context,
    max_questions_per_context=2
):
    questions = []
    answers = extract_key_answers(context, max_answers=5)

    used_answers = set()
    type_cursor = QUESTION_TYPES.copy()
    random.shuffle(type_cursor)
    type_idx = 0

    for ans in answers:
        if len(questions) >= max_questions_per_context:
            break
        if ans.lower() in used_answers:
            continue

        q_type = type_cursor[type_idx % len(QUESTION_TYPES)]
        type_idx += 1

        item = build_question_item(context, ans, q_type)
        if not item:
            continue

        questions.append(item)
        used_answers.add(ans.lower())

    return questions




#def generate_cloze(context, answer):
#    if len(answer.split()) > 3:
#        return None

#    for sent in sent_tokenize(context):
#        if answer.lower() in sent.lower():
#            return re.sub(
#                re.escape(answer),
#                "____",
#                sent,
#                flags=re.IGNORECASE
#            )
#    return None

def generate_cloze(context, answer):
    # Reject email or long answers
    if len(answer.split()) > 3:
        return None
    if re.search(r"@", answer):
        return None

    for sent in sent_tokenize(context):
        if answer.lower() in sent.lower():
            # Avoid title/introduction sentences
            if "introduction" in sent.lower():
                continue

            return re.sub(
                re.escape(answer),
                "____",
                sent,
                flags=re.IGNORECASE
            )
    return None


def mmr_select(candidates, query, k=3, lam=0.7):
    if len(candidates) <= k:
        return candidates

    q_emb = sbert.encode(query, convert_to_tensor=True)
    c_emb = sbert.encode(candidates, convert_to_tensor=True)

    selected = []
    idxs = list(range(len(candidates)))

    for _ in range(k):
        if not selected:
            scores = util.cos_sim(q_emb, c_emb)[0]
        else:
            sim_q = util.cos_sim(q_emb, c_emb[idxs])[0]
            sim_s = util.cos_sim(c_emb[idxs], c_emb[selected]).max(dim=1).values
            scores = lam * sim_q - (1 - lam) * sim_s

        best = idxs[int(scores.argmax())]
        selected.append(best)
        idxs.remove(best)

    return [candidates[i] for i in selected]


def generate_distractors(context, question, answer, k=3):
    prompt = f"""
Generate plausible but incorrect distractors.
Question: {question}
Correct answer: {answer}
Context: {context}
Distractors:
"""

    inputs = dist_tokenizer(
        prompt,
        return_tensors="pt",
        truncation=True,
        max_length=512
    ).to(device)

    with torch.no_grad():
        outputs = dist_model.generate(
            **inputs,
            num_return_sequences=k*2,
            max_new_tokens=80,
            do_sample=True,
            top_p=0.9
        )

    # ✅ Decode FIRST
    decoded = [
        dist_tokenizer.decode(o, skip_special_tokens=True).strip()
        for o in outputs
    ]

    # ✅ Filter AFTER decoding
    candidates = list(set(
        d for d in decoded
        if d and answer.lower() not in d.lower()
    ))

    # MMR selection
    return mmr_select(candidates, question + " " + answer, k)



def generate_quiz_from_pdf(
    pdf_path,
    total_questions=20,
    max_words_per_context=200
):
    # 1. PDF → contexts
    contexts = process_pdf_to_contexts(
        pdf_path,
        max_words=max_words_per_context
    )

    print(f"Extracted {len(contexts)} contexts")

    quiz = []
    ctx_idx = 0

    # 2. Loop through contexts
    while len(quiz) < total_questions and ctx_idx < len(contexts):
        context = contexts[ctx_idx]

        qa_items = generate_questions_from_context(
            context,
            max_questions_per_context=2
        )

        for item in qa_items:
            if len(quiz) >= total_questions:
                break
            quiz.append(item)

        ctx_idx += 1

    return quiz


def split_contexts(text: str, max_words: int = 120):
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
    contexts = []

    for para in paragraphs:
        words = para.split()
        for i in range(0, len(words), max_words):
            chunk = " ".join(words[i:i + max_words])
            if len(chunk.split()) >= 8:
                contexts.append(chunk)

    if not contexts and text.strip():
        fallback = " ".join(text.split()[:max_words])
        if fallback:
            contexts.append(fallback)

    return contexts


def generate_questions(text: str, top_n: int = 4):
    try:
        target_total = max(int(top_n), len(QUESTION_TYPES))
    except (TypeError, ValueError):
        target_total = len(QUESTION_TYPES)

    contexts = split_contexts(text, max_words=150)
    if not contexts:
        return []

    questions = []
    used_answers = set()
    missing_types = set(QUESTION_TYPES)

    # First pass: ensure at least one of each question type
    for q_type in QUESTION_TYPES:
        if q_type not in missing_types:
            continue

        for context in contexts:
            answers = extract_key_answers(context, max_answers=target_total * 2)
            random.shuffle(answers)

            for ans in answers:
                if ans.lower() in used_answers or is_bad_answer(ans):
                    continue

                item = build_question_item(context, ans, q_type)
                if item:
                    questions.append(item)
                    used_answers.add(ans.lower())
                    missing_types.discard(q_type)
                    break

            if q_type not in missing_types:
                break

    # Second pass: fill remaining slots up to target_total
    for context in contexts:
        if len(questions) >= target_total:
            break

        answers = extract_key_answers(context, max_answers=target_total * 2)
        random.shuffle(answers)

        for ans in answers:
            if len(questions) >= target_total:
                break
            if ans.lower() in used_answers or is_bad_answer(ans):
                continue

            q_type = random.choice(QUESTION_TYPES)
            item = build_question_item(context, ans, q_type)
            if item:
                questions.append(item)
                used_answers.add(ans.lower())
                if q_type in missing_types:
                    missing_types.discard(q_type)

    # Final fallback: if any type is still missing, synthesize lightweight items
    if missing_types:
        fallback_context = contexts[0]
        fallback_answers = extract_key_answers(fallback_context, max_answers=target_total) or [fallback_context.split()[0]]

        for q_type in list(missing_types):
            for ans in fallback_answers:
                if ans.lower() in used_answers or is_bad_answer(ans):
                    continue

                item = build_question_item(fallback_context, ans, q_type)
                if item:
                    questions.append(item)
                    used_answers.add(ans.lower())
                    missing_types.discard(q_type)
                    break

            if q_type in missing_types:
                placeholder = fallback_answers[0] if fallback_answers else "the topic"
                if q_type == "cloze":
                    questions.append({
                        "context": fallback_context,
                        "type": "cloze",
                        "question": f"In the passage, ____ refers to {placeholder}.",
                        "answer": placeholder,
                    })
                elif q_type == "mcq":
                    choices = [placeholder, "Not specified", "Unknown", "Cannot be determined"]
                    questions.append({
                        "context": fallback_context,
                        "type": "mcq",
                        "question": f"What does the text mention about {placeholder}?",
                        "answer": placeholder,
                        "choices": choices,
                        "answer_index": 0,
                    })
                else:
                    questions.append({
                        "context": fallback_context,
                        "type": "short",
                        "question": f"What is {placeholder}?",
                        "answer": placeholder,
                    })
                missing_types.discard(q_type)

    return questions[:target_total]
