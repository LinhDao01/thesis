// Use relative path when in dev (proxy will handle it), or full URL in production
const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? '' : 'http://localhost:3000')
const QAG_API_BASE = import.meta.env.VITE_QAG_API_BASE // ví dụ: https://<user>-<space>.hf.space

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }

  const token = localStorage.getItem('access_token')
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(errorData.message || errorData.data?.message || `${res.status} ${res.statusText}`)
  }
  return res.json()
}

// Request to QAG service (external)
async function qagRequest(path, options = {}) {
  if (!QAG_API_BASE) {
    throw new Error('QAG_API_BASE not configured')
  }
  const url = `${QAG_API_BASE}${path}`
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const res = await fetch(url, { ...options, headers })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

// export const api = {
//   // Backend API endpoints
//   health() { return request('/api/v1/health') },

//   // QAG service endpoints
//   qg(payload) { return qagRequest('/qg', { method: 'POST', body: JSON.stringify(payload) }) },
//   // thêm endpoint khác sau này: /tags, /decks,...
// }

// Helper function to safely parse JSON response
async function safeJsonParse(response) {
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 200)}`);
  }

  const text = await response.text();
  if (!text || text.trim() === '') {
    throw new Error('Empty response from server');
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('Failed to parse JSON:', text.substring(0, 500));
    throw new Error(`Invalid JSON response: ${e.message}`);
  }
}

export const api = {
  generateQuizFromText(text) {
    return fetch(`${API_BASE}/api/v1/qg/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    }).then(async res => {
      const data = await safeJsonParse(res);
      if (!res.ok) {
        throw new Error(data.message || data.data?.message || `${res.status} ${res.statusText}`);
      }
      return data;
    });
  },
  generateQuizFromFile(file, numQuestions = 10) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('numQuestions', numQuestions.toString());

    return fetch(`${API_BASE}/api/v1/qg/file`, {
      method: "POST",
      body: formData
    }).then(async res => {
      const data = await safeJsonParse(res);
      if (!res.ok) {
        throw new Error(data.message || data.data?.message || `${res.status} ${res.statusText}`);
      }
      return data;
    });
  },
  saveQuiz(userId, title, questions) {
    return request('/api/v1/quiz', {
      method: 'POST',
      body: JSON.stringify({ userId, title, questions })
    });
  },
  updateQuiz(quizId, userId, title, questions) {
    return request(`/api/v1/quiz/${quizId}`, {
      method: 'PUT',
      body: JSON.stringify({ userId, title, questions })
    });
  },
  getQuiz(quizId) {
    return request(`/api/v1/quiz/${quizId}`);
  },
  getQuizQuestions(quizId) {
    return request(`/api/v1/quiz/${quizId}/questions`);
  },
  submitQuizAttempt(quizId, userId, answers) {
    return request(`/api/v1/quiz/${quizId}/attempt`, {
      method: 'POST',
      body: JSON.stringify({ userId, answers })
    });
  },
  getUserQuizzes(userId) {
    return request(`/api/v1/quiz?userId=${userId}`);
  },
  deleteQuiz(quizId, userId) {
    return request(`/api/v1/quiz/${quizId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId })
    });
  },
  getQuizDetail(quizId, userId) {
    return request(`/api/v1/quiz/${quizId}/detail?userId=${userId}`);
  }
};