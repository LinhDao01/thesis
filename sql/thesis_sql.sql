-- CREATE DATABASE thesis_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE thesis_db;

-- Tạo bảng người dùng
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo bảng quiz (mỗi lần user tạo bài quiz)
CREATE TABLE quizzes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  title VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Câu hỏi
CREATE TABLE questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT,
  question_text TEXT,
  correct_answer TEXT,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
);

-- Các lựa chọn (A–D)
CREATE TABLE answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT,
  option_text TEXT,
  is_correct BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (question_id) REFERENCES questions(id)
);

select * from users;