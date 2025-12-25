#!/usr/bin/env python3
"""
Test script to verify all required dependencies are installed correctly
"""
import sys

print("Testing dependencies...\n")

# Check NumPy/SciPy compatibility first to avoid import errors
try:
    import numpy as np
    import scipy
    print(f"✓ NumPy version: {np.__version__}")
    print(f"✓ SciPy version: {scipy.__version__}")
    
    # Test compatibility
    try:
        from scipy.stats import fisher_exact
    except ValueError as e:
        if "numpy.dtype size changed" in str(e):
            print(f"\n❌ NUMPY/SCIPY VERSION CONFLICT DETECTED!")
            print(f"   NumPy {np.__version__} is not compatible with SciPy {scipy.__version__}")
            print(f"   Fix: Run 'python fix_numpy_scipy.py' or 'pip install numpy==1.26.4 scipy==1.11.4'")
            sys.exit(1)
        else:
            raise
except ImportError as e:
    print(f"⚠️  Warning: Could not check NumPy/SciPy compatibility: {e}")

print()

errors = []

# Test PyMuPDF (fitz)
try:
    import fitz
    print("✓ PyMuPDF (fitz) installed")
except ImportError:
    print("✗ PyMuPDF not found - Install: pip install pymupdf")
    errors.append("pymupdf")

# Test pytesseract and Tesseract OCR
try:
    import pytesseract
    print("✓ pytesseract installed")
    try:
        version = pytesseract.get_tesseract_version()
        print(f"  Tesseract OCR version: {version}")
    except Exception as e:
        print(f"✗ Tesseract OCR executable not found: {e}")
        print("  Please install Tesseract OCR on your system")
        errors.append("tesseract-ocr")
except ImportError:
    print("✗ pytesseract not found - Install: pip install pytesseract")
    errors.append("pytesseract")

# Test Pillow (PIL)
try:
    from PIL import Image
    print("✓ Pillow (PIL) installed")
except ImportError:
    print("✗ Pillow not found - Install: pip install Pillow")
    errors.append("pillow")

# Test NLTK
try:
    import nltk
    print(f"✓ NLTK installed (version: {nltk.__version__})")
    print(f"  NLTK data path: {nltk.data.path[0] if nltk.data.path else 'Not set'}")
    try:
        nltk.data.find('tokenizers/punkt')
        print("  ✓ punkt data found")
    except LookupError:
        print("  ✗ punkt data missing")
        errors.append("nltk-punkt")
    try:
        nltk.data.find('corpora/wordnet')
        print("  ✓ wordnet data found")
    except LookupError as e:
        print(f"  ✗ wordnet data missing: {e}")
        print("  Run: python -c \"import nltk; nltk.download('wordnet', quiet=False)\"")
        errors.append("nltk-wordnet")
except ImportError:
    print("✗ NLTK not found - Install: pip install nltk")
    errors.append("nltk")

# Test spaCy
try:
    import spacy
    try:
        nlp = spacy.load("en_core_web_sm")
        print("✓ spaCy installed with en_core_web_sm model")
    except OSError:
        print("✗ spaCy model 'en_core_web_sm' not found")
        print("  Run: python -m spacy download en_core_web_sm")
        errors.append("spacy-model")
except ImportError:
    print("✗ spaCy not found - Install: pip install spacy")
    errors.append("spacy")

# Test PyTorch
try:
    import torch
    print(f"✓ PyTorch installed (version {torch.__version__})")
    if torch.cuda.is_available():
        print(f"  CUDA available: {torch.cuda.get_device_name(0)}")
    else:
        print("  Using CPU")
except ImportError:
    print("✗ PyTorch not found - Install: pip install torch")
    errors.append("torch")

# Test transformers
try:
    from transformers import T5Tokenizer, T5ForConditionalGeneration
    print("✓ transformers installed")
except ImportError:
    print("✗ transformers not found - Install: pip install transformers")
    errors.append("transformers")

# Test sentence-transformers
try:
    from sentence_transformers import SentenceTransformer, util
    print("✓ sentence-transformers installed")
except ImportError:
    print("✗ sentence-transformers not found - Install: pip install sentence-transformers")
    errors.append("sentence-transformers")

# Test huggingface_hub
try:
    import huggingface_hub
    print("✓ huggingface_hub installed")
except ImportError:
    print("✗ huggingface_hub not found - Install: pip install huggingface_hub")
    errors.append("huggingface_hub")

# Test numpy and scipy
try:
    import numpy
    print(f"✓ numpy installed (version {numpy.__version__})")
except ImportError:
    print("✗ numpy not found - Install: pip install numpy")
    errors.append("numpy")

try:
    import scipy
    print(f"✓ scipy installed (version {scipy.__version__})")
except ImportError:
    print("✗ scipy not found - Install: pip install scipy")
    errors.append("scipy")

print("\n" + "="*50)
if errors:
    print(f"❌ Found {len(errors)} issue(s). Please fix them before running the code.")
    print("\nMissing dependencies:", ", ".join(errors))
else:
    print("✅ All dependencies are installed correctly!")
print("="*50)

import nltk
nltk.data.path.append(r"C:\Users\MSIGF63\AppData\Roaming\nltk_data")

from nltk.corpus import wordnet as wn
print(wn.synsets("dog"))

