import torch # type: ignore
import re
import json
import nltk
import spacy
import numpy as np
import random
from transformers import BartTokenizer, BartForConditionalGeneration
from sentence_transformers import SentenceTransformer

# ------------------- INIT + LOAD RESOURCE -------------------
nltk.download('wordnet', quiet=True)
nltk.download('omw-1.4', quiet=True)
nlp = spacy.load("en_core_web_sm")
st_model = SentenceTransformer('all-MiniLM-L6-v2')

# ------------------- LOAD FINE-TUNED MODEL -------------------
MODEL_PATH = "E:\code\backend\fastAPI\bart-qag-model"  # <- sửa theo nơi bạn đặt checkpoint local

tokenizer = BartTokenizer.from_pretrained(MODEL_PATH)
model = BartForConditionalGeneration.from_pretrained(MODEL_PATH)
model.eval()

# Thêm special tokens
special_tokens = ["<task:short>", "<task:cloze>", "<task:mcq>"]
tokenizer.add_special_tokens({"additional_special_tokens": special_tokens})
model.resize_token_embeddings(len(tokenizer))


# ------------------- UTILS -------------------
def clean_question(raw_text: str) -> str:
    text = raw_text.strip()
    try:
        if text.startswith(("{", "[")):
            data = json.loads(text)
            if isinstance(data, dict) and "question" in data:
                text = data["question"]
    except: pass

    match = re.search(r'"question"\s*:\s*"([^"]+)"', text, re.I)
    if match: text = match.group(1)
    text = re.split(r'[\{\[]', text)[0]
    text = re.sub(r'["\']?[A-D]["\']?\)?\s*$', '', text)
    text = re.sub(r'^(question|Q)[\s.:-]*\s*', '', text, flags=re.I)
    text = text.strip(' .,_-":;')
    if text and not text.endswith("?"):
        text += "?"
    return text.strip()

def generate_question(task_type: str, context: str, answer: str) -> str:
    input_text = f"<task:{task_type}>\ncontext: {context}\nanswer: {answer}"
    inputs = tokenizer(input_text, return_tensors='pt', truncation=True, max_length=512, padding=True)

    with torch.no_grad():
        outputs = model.generate(
            inputs['input_ids'],
            attention_mask=inputs['attention_mask'],
            max_length=100,
            num_beams=8,
            length_penalty=0.6,
            early_stopping=True,
            no_repeat_ngram_size=3,
            temperature=0.85,
            top_p=0.92,
            do_sample=True
        )
    return clean_question(tokenizer.decode(outputs[0], skip_special_tokens=True))

def extract_key_answers(context: str, top_n: int = 5) -> list:
    doc = nlp(context)
    candidates, seen = [], set()

    for ent in doc.ents:
        text = ent.text.strip()
        if text in seen: continue
        if ent.label_ == "ORDINAL" and any(w in text.lower() for w in ["president", "king", "pope", "term"]): continue
        if ent.label_ in ["PERSON", "GPE", "ORG", "DATE", "CARDINAL", "NORP", "EVENT"]:
            candidates.append((text, 10.0))
            seen.add(text)

    for m in re.finditer(r'\b(19|20)\d{2}\b', context):
        year = m.group()
        if year not in seen:
            candidates.append((year, 9.0))
            seen.add(year)

    for chunk in doc.noun_chunks:
        text = chunk.text.strip()
        if text in seen or len(text.split()) > 6: continue
        if any(t.lower_ in ["he", "she", "his", "her", "they"] for t in chunk): continue
        candidates.append((text, 6.0))
        seen.add(text)

    candidates.sort(key=lambda x: x[1], reverse=True)
    return [text for text, _ in candidates[:top_n]]


def generate_distractors(answer: str, context: str, num: int = 3, allow_long: bool = False) -> list:
    doc = nlp(context)
    distractors = set()
    answer_lower = answer.lower().strip()

    answer_label = None
    for ent in doc.ents:
        if ent.text.lower() == answer_lower:
            answer_label = ent.label_
            break
    if answer_label:
        for ent in doc.ents:
            if ent.label_ == answer_label and ent.text.lower() != answer_lower:
                distractors.add(ent.text)

    knowledge = {
        "president|obama|trump|biden|clinton|washington": [
            "George Washington", "Abraham Lincoln", "John F. Kennedy", "Ronald Reagan"
        ],
        "united states|america": ["Canada", "United Kingdom", "China", "Russia", "Germany"]
    }
    ctx_low = context.lower()
    for pattern, items in knowledge.items():
        if re.search(pattern, ctx_low):
            for item in items:
                if item.lower() != answer_lower:
                    distractors.add(item)

    nums = re.findall(r'\b\d+\b', answer)
    for n_str in nums:
        try:
            n = int(n_str)
            for d in [-10, -5, -2, -1, 1, 2, 5, 10]:
                distractors.add(str(n + d))
        except: pass

    candidates = []
    for chunk in doc.noun_chunks:
        t = chunk.text.strip()
        if len(t.split()) <= 10 and t.lower() != answer_lower:
            candidates.append(t)
    for ent in doc.ents:
        if ent.text not in candidates:
            candidates.append(ent.text)

    if candidates:
        try:
            a_emb = st_model.encode(answer)
            c_embs = st_model.encode(candidates)
            sims = np.dot(c_embs, a_emb) / (np.linalg.norm(c_embs, axis=1) * np.linalg.norm(a_emb) + 1e-8)
            top_idx = np.argsort(sims)[-15:][::-1]
            for idx in top_idx:
                if sims[idx] > 0.38:
                    distractors.add(candidates[idx])
        except: pass

    if allow_long or len(answer.split()) >= 3:
        words = answer.split()
        if len(words) >= 2:
            distractors.add(f"President {words[-1]}")
        distractors.update(["The capital city of France", "The first man on the moon"])

    final = [d for d in distractors if d.lower() != answer_lower and d.strip()]
    random.shuffle(final)
    return final[:num]


# ------------------- MAIN PUBLIC FUNCTION -------------------
def generate_questions(context: str, top_n: int = 4, long_distractors: bool = False):
    answers = extract_key_answers(context, top_n=top_n)
    results = []

    for answer in answers:
        short = generate_question("short", context, answer)
        cloze = generate_question("cloze", context, answer)
        mcq   = generate_question("mcq",   context, answer)
        distracts = generate_distractors(answer, context, num=3, allow_long=long_distractors)
        choices = [answer] + distracts
        random.shuffle(choices)

        results.append({
            "type": "mcq", "question": mcq,
            "answer": answer, "choices": choices
        })
    return results
