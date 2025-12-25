# Environment Variables Setup

## Required Environment Variables

Tạo file `.env` trong thư mục `backend/` với nội dung sau:

```env
# Server Configuration
PORT=3000

# Frontend Origin
FRONTEND_ORIGIN=http://localhost:5173

# Database Configuration
DATABASE_URL="mysql://user:password@localhost:3306/quiz_db"

# JWT Secret (use a strong random string in production)
JWT_SECRET=your-secret-key-change-in-production

# Hugging Face Space API (optional - only needed if Python scripts fail)
# Format: https://<username>-<space-name>.hf.space
# Example: https://your-username-quiz-generator.hf.space
QAG_API_BASE=
```

## Giải thích

### PORT
Port mà backend server sẽ chạy. Mặc định là 3000.

### FRONTEND_ORIGIN
URL của frontend application. Có thể là:
- Single origin: `http://localhost:5173`
- Multiple origins: `http://localhost:5173,http://localhost:3001`
- All origins: `*`

### DATABASE_URL
Connection string cho MySQL database. Format:
```
mysql://username:password@host:port/database_name
```

### JWT_SECRET
Secret key để sign JWT tokens. **QUAN TRỌNG**: Thay đổi giá trị này trong production!

### QAG_API_BASE (Optional)
URL của Hugging Face Space API. Chỉ cần thiết nếu:
- Python scripts không hoạt động
- Bạn muốn sử dụng Hugging Face Space làm fallback

Nếu không set, hệ thống sẽ chỉ sử dụng Python scripts. Nếu Python fail và QAG_API_BASE không được set, sẽ trả về lỗi rõ ràng.

## Cách tạo file .env

1. Copy file này và đổi tên thành `.env`
2. Điền các giá trị phù hợp với môi trường của bạn
3. **KHÔNG** commit file `.env` vào git (đã có trong .gitignore)

## Troubleshooting

### Lỗi: "QAG_API_BASE environment variable is not set"
- **Giải pháp 1**: Cài đặt Python dependencies: `pip install -r requirements.txt`
- **Giải pháp 2**: Set QAG_API_BASE trong file .env

### Lỗi: "Resource not found"
- Kiểm tra backend server đã khởi động chưa (port 3000)
- Kiểm tra route có được mount đúng không
- Kiểm tra URL trong frontend có đúng không


