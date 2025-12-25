const LS_TOKEN_KEY = 'access_token'
const LS_USER_KEY  = 'auth_user'

/** Tài khoản gán cứng để demo */
const USERS = [
  { id: 1, name: 'Student One', email: 'student@example.com', password: '123456', role: 'student' },
  { id: 2, name: 'Teacher One', email: 'teacher@example.com', password: '123456', role: 'teacher' },
  { id: 3, name: 'Admin One',   email: 'admin@example.com',   password: '123456', role: 'admin'   },
]

function _saveSession(user) {
  // token giả, bạn có thể encode thêm nếu thích
  const token = `mock.${user.id}.${Date.now()}`
  localStorage.setItem(LS_TOKEN_KEY, token)
  localStorage.setItem(LS_USER_KEY, JSON.stringify(user))
  return token
}

export const auth = {
  login(email, password) {
    const u = USERS.find(x => x.email === email && x.password === password)
    if (!u) throw new Error('Email hoặc mật khẩu không đúng')
    const token = _saveSession(u)
    return { token, user: u }
  },
  logout() {
    localStorage.removeItem(LS_TOKEN_KEY)
    localStorage.removeItem(LS_USER_KEY)
  },
  isAuthenticated() {
    return !!localStorage.getItem(LS_TOKEN_KEY)
  },
  token() {
    return localStorage.getItem(LS_TOKEN_KEY)
  },
  currentUser() {
    const raw = localStorage.getItem(LS_USER_KEY)
    return raw ? JSON.parse(raw) : null
  }
}
