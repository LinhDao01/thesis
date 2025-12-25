import fitz  # PyMuPDF
import sys
import io

# Set UTF-8 encoding for stdout/stderr on Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Trích xuất toàn bộ văn bản từ file PDF.
    """
    try:
        doc = fitz.open(pdf_path)
        all_text = "\n".join(page.get_text() for page in doc)
        return all_text.strip()
    except Exception as e:
        raise RuntimeError(f"Failed to extract PDF: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_text.py <pdf_path>", file=sys.stderr)
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    try:
        text = extract_text_from_pdf(pdf_path)
        # Ensure output is UTF-8 encoded
        print(text, flush=True)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr, flush=True)
        sys.exit(1)
