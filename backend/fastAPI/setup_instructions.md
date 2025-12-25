# Setup Instructions cho FastAPI Quiz Generator

## 1. Cài đặt Python Dependencies

```bash
pip install -r requirements.txt
```

## 2. Cài đặt Tesseract OCR (Hệ thống)

### Windows:
- Tải Tesseract từ: https://github.com/UB-Mannheim/tesseract/wiki
- Cài đặt và ghi nhớ đường dẫn cài đặt (thường là `C:\Program Files\Tesseract-OCR`)
- Thêm vào PATH hoặc set biến môi trường:
  ```bash
  setx PATH "%PATH%;C:\Program Files\Tesseract-OCR"
  ```

### Linux (Ubuntu/Debian):
```bash
sudo apt-get update
sudo apt-get install tesseract-ocr
```

### macOS:
```bash
brew install tesseract
```

## 3. Cài đặt SpaCy Model

Sau khi cài spacy, cần tải model tiếng Anh:

```bash
python -m spacy download en_core_web_sm
```

## 4. Tải NLTK Data

NLTK sẽ tự động tải data khi chạy code (với `nltk.download("punkt", quiet=True)`), nhưng bạn cũng có thể tải trước:

```bash
python -c "import nltk; nltk.download('punkt'); nltk.download('wordnet'); nltk.download('omw-1.4')"
```

## 5. Model Files

Code sử dụng các model sau (sẽ tự động tải lần đầu chạy):

### Sentence Transformers:
- `all-MiniLM-L6-v2` (tự động tải khi import SentenceTransformer)

### Hugging Face Transformers:
- `google/flan-t5-large` (tự động tải khi import, hoặc từ local path nếu đã tải trước)

**Lưu ý:** 
- Model `flan-t5-large` khá lớn (~3GB), đảm bảo có đủ dung lượng và kết nối mạng ổn định lần đầu chạy.
- Code sử dụng local path `E:\code\backend\fastAPI\flan-t5-large` cho QAG model, nếu không có model ở đó sẽ cần tải từ Hugging Face.

## 6. PyTorch (CPU vs GPU)

Nếu có GPU NVIDIA với CUDA:
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

Nếu chỉ có CPU:
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

Code tự động detect GPU/CPU với `torch.cuda.is_available()`.

## 7. Kiểm tra Cài đặt

Chạy test script để kiểm tra:

```python
# test_imports.py
try:
    import fitz
    print("✓ PyMuPDF installed")
except ImportError:
    print("✗ PyMuPDF not found")

try:
    import pytesseract
    print("✓ pytesseract installed")
    # Test if tesseract executable is found
    pytesseract.get_tesseract_version()
    print("✓ Tesseract OCR found")
except Exception as e:
    print(f"✗ pytesseract/Tesseract error: {e}")

try:
    from PIL import Image
    print("✓ Pillow installed")
except ImportError:
    print("✗ Pillow not found")

try:
    import nltk
    nltk.data.find('tokenizers/punkt')
    print("✓ NLTK installed with punkt data")
except:
    print("✗ NLTK or punkt data not found")

try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
    print("✓ spaCy installed with en_core_web_sm model")
except Exception as e:
    print(f"✗ spaCy error: {e}")

try:
    import torch
    print(f"✓ PyTorch installed (version {torch.__version__})")
    print(f"  Device: {'CUDA' if torch.cuda.is_available() else 'CPU'}")
except ImportError:
    print("✗ PyTorch not found")

try:
    from transformers import T5Tokenizer, T5ForConditionalGeneration
    print("✓ transformers installed")
except ImportError:
    print("✗ transformers not found")

try:
    from sentence_transformers import SentenceTransformer
    print("✓ sentence-transformers installed")
except ImportError:
    print("✗ sentence-transformers not found")

print("\nAll checks completed!")
```

## Troubleshooting

### Tesseract không tìm thấy:
- Windows: Thêm đường dẫn vào PATH hoặc set `pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'` trong code
- Linux/Mac: Đảm bảo tesseract đã được cài đặt trong system

### Model download chậm:
- Có thể tải model trước và lưu vào local path
- Sử dụng `HF_ENDPOINT` environment variable nếu cần mirror server

### GPU không được sử dụng:
- Kiểm tra CUDA version: `python -c "import torch; print(torch.cuda.is_available())"`
- Đảm bảo đã cài PyTorch với CUDA support


