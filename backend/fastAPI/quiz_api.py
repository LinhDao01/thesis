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

        q_type = random.choice(QUESTION_TYPES)
        base_question = generate_question(context, ans)

        item = {
            "context": context,
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
