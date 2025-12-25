# Hướng dẫn cài đặt Python Dependencies

## Vấn đề

Nếu bạn gặp lỗi:
```
Quiz generation failed: Python script failed and QAG_API_BASE is not configured
```

Điều này có nghĩa là Python dependencies chưa được cài đặt.

## Giải pháp

### Bước 1: Kiểm tra Python đã được cài đặt

```bash
python --version
# hoặc
python3 --version
```

Phải là Python 3.8 trở lên.

### Bước 2: Cài đặt dependencies

**Windows:**
```bash
cd backend\fastAPI
pip install -r requirements.txt
```

**Linux/Mac:**
```bash
cd backend/fastAPI
pip3 install -r requirements.txt
```

### Bước 3: Kiểm tra cài đặt

```bash
python -c "import fitz; import transformers; print('All dependencies installed!')"
```

Nếu không có lỗi, dependencies đã được cài đặt thành công.

## Dependencies cần thiết

- `pymupdf` - Để đọc file PDF
- `numpy` - Thư viện tính toán
- `scipy` - Thư viện khoa học
- `transformers` - Hugging Face transformers
- `sentence-transformers` - Sentence embeddings
- `huggingface_hub` - Hugging Face Hub

## Troubleshooting

### Lỗi: "pip is not recognized"
- Cài đặt Python từ python.org
- Đảm bảo chọn "Add Python to PATH" khi cài đặt

### Lỗi: "No module named 'fitz'"
- Chạy lại: `pip install pymupdf`

### Lỗi: "Microsoft Visual C++ 14.0 is required"
- Windows: Cài đặt Visual Studio Build Tools
- Hoặc sử dụng pre-built wheels: `pip install --only-binary :all: pymupdf`

### Lỗi: Out of memory khi cài đặt
- Cài từng package một:
```bash
pip install pymupdf
pip install numpy
pip install scipy
pip install transformers
pip install sentence-transformers
pip install huggingface_hub
```

## Fallback Options

Nếu không thể cài đặt Python dependencies, bạn có thể:

1. **Sử dụng Hugging Face Space API:**
   - Tạo file `.env` trong `backend/`
   - Thêm: `QAG_API_BASE=https://your-username-quiz-generator.hf.space`

2. **Sử dụng Simple Fallback:**
   - Hệ thống sẽ tự động sử dụng simple quiz generator nếu cả Python và Hugging Face đều fail
   - Chất lượng sẽ thấp hơn nhưng vẫn hoạt động

## Kiểm tra sau khi cài đặt

Sau khi cài đặt xong, khởi động lại backend và thử tạo quiz lại:

```bash
cd backend
node index.js
```

Nếu vẫn gặp lỗi, kiểm tra backend logs để xem lỗi cụ thể.


