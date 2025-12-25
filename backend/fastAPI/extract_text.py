import fitz  # PyMuPDF
import pytesseract
from PIL import Image
from io import BytesIO
import re
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from sentence_transformers import SentenceTransformer, util

nltk.download("punkt", quiet=True)

# Load Sentence-BERT
sbert = SentenceTransformer("all-MiniLM-L6-v2")

def is_page_text_based(page):
    return bool(page.get_text().strip())

def extract_text_from_image_page(page, dpi=300, lang="eng"):
    pix = page.get_pixmap(dpi=dpi)
    img = Image.open(BytesIO(pix.tobytes("png")))
    return pytesseract.image_to_string(img, lang=lang)

def normalize_text(text: str) -> str:
    text = re.sub(r"(\w+)-\s*\n\s*(\w+)", r"\1\2", text)  # nối từ bị gạch dòng
    text = re.sub(r"\n+", "\n", text)                    # giữ newline để xử lý layout
    text = re.sub(r"\s{2,}", " ", text)
    text = text.replace('“', '"').replace('”', '"')
    text = text.replace("‘", "'").replace("’", "'")
    text = text.replace("–", "-").replace("—", "-")
    return text.strip()

def clean_layout(text: str) -> str:
    lines = text.split("\n")
    cleaned_lines = []

    for line in lines:
        line = line.strip()

        # Remove page numbers (standalone digits)
        if re.fullmatch(r"\d{1,3}", line):
            continue

        # Remove bullet symbols
        line = re.sub(r"[•▪►●■]", "", line)

        # Normalize whitespace
        line = re.sub(r"\s+", " ", line)

        if line:
            cleaned_lines.append(line)

    return "\n".join(cleaned_lines)

def reconstruct_sentences(text: str) -> list:
    lines = text.split("\n")
    merged = []
    buffer = ""

    for line in lines:
        line = line.strip()
        if not line:
            continue

        buffer += " " + line
        if re.search(r"[.!?]$", line):
            merged.append(buffer.strip())
            buffer = ""

    if buffer:
        merged.append(buffer.strip())

    sentences = []
    for block in merged:
        sentences.extend(sent_tokenize(block))

    return sentences

def remove_semantic_duplicates(sentences, threshold=0.85):
    if len(sentences) <= 1:
        return sentences

    embeddings = sbert.encode(sentences, convert_to_tensor=True)
    keep = [True] * len(sentences)

    for i in range(len(sentences)):
        if not keep[i]:
            continue
        for j in range(i + 1, len(sentences)):
            sim = util.cos_sim(embeddings[i], embeddings[j])
            if sim > threshold:
                keep[j] = False

    return [s for s, k in zip(sentences, keep) if k]

def build_contexts(sentences, max_words=200, min_sentences=2):
    contexts = []
    current = []
    word_count = 0

    for sent in sentences:
        sent_len = len(sent.split())
        if word_count + sent_len > max_words:
            if len(current) >= min_sentences:
                contexts.append(" ".join(current))
            current = [sent]
            word_count = sent_len
        else:
            current.append(sent)
            word_count += sent_len

    if len(current) >= min_sentences:
        contexts.append(" ".join(current))

    # Fallback for short/fragmented text
    if not contexts and sentences:
        contexts.append(" ".join(sentences))

    return contexts


def is_valid_context(context: str) -> bool:
    text = context.lower()

    # 1. Remove email-heavy contexts
    if re.search(r"[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}", text):
        return False

    # 2. Remove introduction / metadata
    banned_keywords = [
        "introduction",
        "author",
        "student",
        "supervisor",
        "email",
        "lecturer",
        "university",
        "faculty",
        "course",
        "chapter",
        "table of contents"
    ]
    if any(k in text for k in banned_keywords):
        return False

    # 3. Too short → not reading content
    if len(text.split()) < 30:
        return False

    return True

def process_pdf_to_contexts(filepath: str, max_words=200, ocr_lang="eng"):
    doc = fitz.open(filepath)
    all_contexts = []

    for i, page in enumerate(doc):
        print(f"Processing page {i+1}/{len(doc)}...")

        text = page.get_text() if is_page_text_based(page) \
               else extract_text_from_image_page(page, lang=ocr_lang)

        text = normalize_text(text)
        text = clean_layout(text)

        sentences = reconstruct_sentences(text)
        sentences = remove_semantic_duplicates(sentences)

        contexts = build_contexts(sentences, max_words=max_words)

        #FILTER CONTEXTS
        for ctx in contexts:
            if is_valid_context(ctx):
                all_contexts.append(ctx)

    return all_contexts

