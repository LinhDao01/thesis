const LS_TOKEN_KEY = 'access_token'
const LS_USER_KEY = 'auth_user'

// Use relative path when in dev (proxy will handle it), or full URL in production
const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? '' : 'http://localhost:3000')

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }

  const token = localStorage.getItem(LS_TOKEN_KEY)
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { ...options, headers })
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(errorData.message || errorData.data?.message || `${res.status} ${res.statusText}`)
  }
  
  return res.json()
}

function _saveSession(token, user) {
  localStorage.setItem(LS_TOKEN_KEY, token)
  localStorage.setItem(LS_USER_KEY, JSON.stringify(user))
}

export const auth = {
  async login(email, password) {
    const response = await request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    
    if (response.status === 'success' && response.data) {
      const { token, user } = response.data
      _saveSession(token, user)
      return { token, user }
    }
    
    throw new Error('Login failed')
  },

  async register(email, password, name) {
    const response = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    })
    
    if (response.status === 'success' && response.data) {
      const { token, user } = response.data
      _saveSession(token, user)
      return { token, user }
    }
    
    throw new Error('Registration failed')
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

