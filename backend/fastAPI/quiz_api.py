import os
import torch
import random
import re
import spacy
import nltk
from nltk.tokenize import sent_tokenize
from transformers import T5Tokenizer, T5ForConditionalGeneration
from sentence_transformers import SentenceTransformer, util
from nltk.corpus import wordnet as wn

from extract_text import process_pdf_to_contexts

# Set NLTK data path to use existing wordnet data
nltk_data_path = r"C:\Users\MSIGF63\AppData\Roaming\nltk_data"
if nltk_data_path not in nltk.data.path:
    nltk.data.path.insert(0, nltk_data_path)

# Download punkt if needed (for tokenization)
nltk.download("punkt", quiet=True)
nltk.download("wordnet", quiet=True)
nltk.download("omw-1.4", quiet=True)

device = "cuda" if torch.cuda.is_available() else "cpu"

# =========================
# Load models
# =========================

# QAG model (FINETUNED)
QAG_MODEL_PATH = "E:\code\backend\fastAPI\flan-t5-large"
_qag_model = None
_qag_tokenizer = None

# Distractor model (BASE)
DIST_MODEL_NAME = os.environ.get("DIST_MODEL_NAME", "google/flan-t5-large")
DISTRACTOR_ENABLED = os.environ.get("ENABLE_DISTRACTORS", "1") != "0"
_dist_tokenizer = None
_dist_model = None

# NLP tools
nlp = spacy.load("en_core_web_sm")
sbert = SentenceTransformer("all-MiniLM-L6-v2")


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


def _load_qag_model():
    """
    Lazy-load the finetuned QAG model with lower memory pressure.
    Uses float16 on CUDA when available to reduce footprint and avoid native crashes.
    """
    global _qag_model, _qag_tokenizer
    if _qag_model is not None:
        return _qag_model, _qag_tokenizer

    _qag_tokenizer = T5Tokenizer.from_pretrained("./flan-t5-large")
    try:
        _qag_model = T5ForConditionalGeneration.from_pretrained(
            QAG_MODEL_PATH,
            low_cpu_mem_usage=True,
            torch_dtype=torch.float16 if device == "cuda" else None
        ).to(device)
    except RuntimeError as exc:
        raise RuntimeError(
            "Failed to load QAG model. Reduce model size or set CUDA_VISIBLE_DEVICES='' to force CPU."
        ) from exc
    _qag_model.eval()
    return _qag_model, _qag_tokenizer


def _load_dist_model():
    """
    Lazy-load the distractor model only when needed to avoid double-loading large checkpoints.
    Can be disabled via ENABLE_DISTRACTORS=0 to prevent OOM/driver crashes.
    """
    global _dist_model, _dist_tokenizer
    if _dist_model is not None and _dist_tokenizer is not None:
        return _dist_model, _dist_tokenizer

    _dist_tokenizer = T5Tokenizer.from_pretrained(DIST_MODEL_NAME)
    try:
        _dist_model = T5ForConditionalGeneration.from_pretrained(
            DIST_MODEL_NAME,
            low_cpu_mem_usage=True,
            torch_dtype=torch.float16 if device == "cuda" else None
        ).to(device)
    except RuntimeError as exc:
        raise RuntimeError(
            "Failed to load distractor model. Set ENABLE_DISTRACTORS=0 or DIST_MODEL_NAME to a smaller checkpoint."
        ) from exc
    _dist_model.eval()
    return _dist_model, _dist_tokenizer


QUESTION_TYPES = ["short", "cloze", "mcq"]

def generate_questions_from_context(
    context,
    max_questions_per_context=2
):
    questions = []
    answers = extract_key_answers(context, max_answers=5)
    random.shuffle(answers)

    used_answers = set()

    for ans in answers:
        if len(questions) >= max_questions_per_context:
            break
        if ans.lower() in used_answers:
            continue
        if is_bad_answer(ans):
            continue

        q_type = random.choice(QUESTION_TYPES)
        base_question = generate_question(context, ans)

        item = {
            "context": context,
            "context_text": context,
            "type": q_type,
            "question": base_question,
            "answer": ans
        }

        # Cloze handling
        if q_type == "cloze":
            cloze = generate_cloze(context, ans)
            if cloze:
                item["question"] = cloze
            else:
                item["type"] = "short"

        # MCQ handling
        if item["type"] == "mcq":
            item["distractors"] = generate_distractors(
                context,
                item["question"],
                ans,
                k=3
            )

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
    if not DISTRACTOR_ENABLED:
        return []

    dist_model, dist_tokenizer = _load_dist_model()
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



def generate_question(context, answer, max_new_tokens=80):
    qag_model, qag_tokenizer = _load_qag_model()
    prompt = f"""
Generate a question whose answer is "{answer}".
Context: {context}
Question:
"""

    inputs = qag_tokenizer(
        prompt,
        return_tensors="pt",
        truncation=True,
        max_length=512
    ).to(device)

    with torch.no_grad():
        output = qag_model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=True,
            top_p=0.9,
            temperature=0.8,
            num_return_sequences=1
        )

    return qag_tokenizer.decode(output[0], skip_special_tokens=True).strip()



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
