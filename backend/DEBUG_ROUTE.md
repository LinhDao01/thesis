# Debug Route: POST /api/v1/qg/file

## ✅ Route đã được mount đúng

Test với curl cho thấy route hoạt động:
```bash
curl -X POST http://localhost:3000/api/v1/qg/file -F "file=@package.json"
# Response: {"status":"error","message":"Only PDF or TXT allowed"}
```

Lỗi này là **đúng** vì `package.json` không phải PDF/TXT. Điều này chứng minh:
- ✅ Route đã được mount
- ✅ Multer middleware hoạt động
- ✅ File filter hoạt động
- ✅ Error handling hoạt động

## 🔍 Nguyên nhân "Resource not found"

Nếu bạn vẫn gặp lỗi "Resource not found", có thể do:

### 1. Request Method sai
**Phải dùng POST, không phải GET:**
```bash
# ❌ SAI
GET http://localhost:3000/api/v1/qg/file

# ✅ ĐÚNG
POST http://localhost:3000/api/v1/qg/file
```

### 2. Backend chưa khởi động lại
Sau khi sửa code, **phải khởi động lại backend**:
```bash
cd backend
# Dừng server (Ctrl+C)
npm run dev
# hoặc
node index.js
```

### 3. URL không đúng
**URL đúng:**
- `http://localhost:3000/api/v1/qg/file` (backend trực tiếp)
- `http://localhost:5173/api/v1/qg/file` (qua frontend proxy)

**URL sai:**
- `http://localhost:3000/qg/file` (thiếu `/api/v1`)
- `http://localhost:3000/api/qg/file` (thiếu `/v1`)

### 4. Content-Type không đúng
**Phải dùng `multipart/form-data`:**
```javascript
// Frontend
const formData = new FormData();
formData.append('file', file);
fetch('/api/v1/qg/file', {
  method: 'POST',
  body: formData
  // KHÔNG set Content-Type header - browser sẽ tự set với boundary
});
```

## 🧪 Test Route

### Test với curl:
```bash
# Tạo file test PDF hoặc TXT
echo "This is a test file for quiz generation." > test.txt

# Test với TXT
curl -X POST http://localhost:3000/api/v1/qg/file \
  -F "file=@test.txt"

# Test với PDF (nếu có)
curl -X POST http://localhost:3000/api/v1/qg/file \
  -F "file=@test.pdf"
```

### Test với Postman:
1. Method: **POST**
2. URL: `http://localhost:3000/api/v1/qg/file`
3. Body: **form-data**
4. Key: `file` (type: File)
5. Value: Chọn file PDF hoặc TXT

## 📋 Checklist

- [ ] Backend server đang chạy (port 3000)
- [ ] Request method là **POST** (không phải GET)
- [ ] URL đúng: `/api/v1/qg/file`
- [ ] Content-Type: `multipart/form-data`
- [ ] File field name: `file`
- [ ] File type: PDF hoặc TXT
- [ ] Backend đã được khởi động lại sau khi sửa code

## 🔧 Nếu vẫn gặp lỗi

1. **Kiểm tra backend logs:**
   - Xem có error nào khi mount routes không
   - Xem có request nào đến `/api/v1/qg/file` không

2. **Kiểm tra Network tab trong Browser DevTools:**
   - Xem request method
   - Xem request URL
   - Xem response status và body

3. **Test trực tiếp backend:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/qg/file -F "file=@test.txt"
   ```

