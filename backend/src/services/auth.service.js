// src/services/auth.service.js
// demo: hard-code users in memory, sau này nối DB

// In-memory storage (sẽ thay bằng DB sau)
const USERS = [
  {
    email: "student@example.com",
    password: "123456",
    name: "Student One",
  },
];

async function login(email, password) {
  const user = USERS.find((u) => u.email === email && u.password === password);
  if (!user) {
    return null; // controller sẽ xử lý null => 401
  }

  const token = "mock-" + Date.now();
  return {
    token,
    user: {
      name: user.name,
      email: user.email,
    },
  };
}

async function register(email, password, name) {
  // Kiểm tra email đã tồn tại chưa
  const existingUser = USERS.find((u) => u.email === email);
  if (existingUser) {
    return null; // controller sẽ xử lý null => 409
  }

  // Tạo user mới
  const newUser = {
    email,
    password, // Trong thực tế nên hash password
    name,
  };
  USERS.push(newUser);

  const token = "mock-" + Date.now();
  return {
    token,
    user: {
      name: newUser.name,
      email: newUser.email,
    },
  };
}

module.exports = {
  login,
  register,
};
