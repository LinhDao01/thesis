import os
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


def detect_heading_level(line: str) -> int:
    text = line.strip()
    if not text:
        return 0

    # Level 1: explicit chapter markers or roman numerals
    if re.match(r"^(chapter|chương)\s+\d+[\.:]?\s", text, re.IGNORECASE):
        return 1
    if re.match(r"^[IVXLCDM]+\.\s+\S+", text):
        return 1

    # Level 1-3: numeric outlines (1, 1.1, 1.1.1)
    numeric_match = re.match(r"^(\d+(?:\.\d+){0,2})\s+\S+", text)
    if numeric_match:
        return numeric_match.group(1).count(".") + 1

    return 0


def hierarchical_chunk_document(lines: list) -> list:
    """
    Build chunks that respect the academic layout:
    chapter -> section -> subsection -> paragraph.
    """
    chunks = []
    current_titles = []
    buffer = []

    def flush_buffer():
        if not buffer:
            return
        content = " ".join(buffer).strip()
        if content:
            title = " / ".join(current_titles) if current_titles else "Nội dung"
            chunks.append({"title": title, "content": content})
        buffer.clear()

    for line in lines:
        line = line.strip()
        if not line:
            continue

        level = detect_heading_level(line)
        if level:
            flush_buffer()
            current_titles = current_titles[: level - 1]
            current_titles.append(line)
            continue

        buffer.append(line)

    flush_buffer()
    return chunks


def sentence_window_chunking(sentences, window_size=5, step=None):
    if step is None:
        step = max(1, window_size // 2)

    windows = []
    for start in range(0, len(sentences), step):
        window = sentences[start : start + window_size]
        if window:
            windows.append(" ".join(window))
    return windows


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

    return contexts


def is_valid_context(context: str) -> bool:
    body = context.split("\n", 1)[-1]
    text = body.lower()

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

def save_contexts_to_file(contexts, output_path):
    with open(output_path, "w", encoding="utf-8") as f:
        for idx, ctx in enumerate(contexts, 1):
            f.write(f"--- Chunk {idx} ---\n{ctx}\n\n")


def process_pdf_to_contexts(
    filepath: str,
    max_words=200,
    ocr_lang="eng",
    window_size=5,
    window_step=None,
    output_path=None
):
    doc = fitz.open(filepath)
    all_lines = []

    for i, page in enumerate(doc):
        print(f"Processing page {i+1}/{len(doc)}...")

        text = page.get_text() if is_page_text_based(page) \
               else extract_text_from_image_page(page, lang=ocr_lang)

        text = normalize_text(text)
        text = clean_layout(text)

        all_lines.extend(text.split("\n"))
        all_lines.append("")

    hierarchical_chunks = hierarchical_chunk_document(all_lines)
    all_contexts = []

    for chunk in hierarchical_chunks:
        sentences = reconstruct_sentences(chunk["content"])
        sentences = remove_semantic_duplicates(sentences)

        windows = sentence_window_chunking(
            sentences,
            window_size=window_size,
            step=window_step
        )

        refined_windows = []
        for window in windows:
            refined = build_contexts(
                reconstruct_sentences(window),
                max_words=max_words
            )
            refined_windows.extend(refined or [window])

        for window in refined_windows:
            chunk_text = f"{chunk['title']}\n{window}"
            if is_valid_context(chunk_text):
                all_contexts.append(chunk_text)

    if output_path is None:
        base, _ = os.path.splitext(filepath)
        output_path = f"{base}_processed.txt"

    save_contexts_to_file(all_contexts, output_path)
    print(f"Saved processed chunks to: {output_path}")

    return all_contexts
