<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/services/api'
import { Modal } from 'bootstrap'
import AnswerReviewModal from '@/components/answerReviewModal.vue'

const route = useRoute()
const router = useRouter()
const quizId = route.params.id

const quiz = ref(null)
const attempts = ref([])
const statistics = ref(null)
const loading = ref(true)
const error = ref('')
let confirmModalInstance = null

// Modal state
const showAnswerModal = ref(false)
const reviewQuestions = ref([])
const reviewScore = ref(0)
const reviewMaxScore = ref(0)

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatDuration(seconds) {
  if (!seconds) return 'N/A'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

function getScoreClass(score) {
  if (score >= 80) return 'text-success'
  if (score >= 60) return 'text-warning'
  return 'text-danger'
}

async function viewAttempt(attemptId) {
  const attempt = attempts.value.find(a => a.id === attemptId)
  if (!attempt) {
    console.error('Attempt not found:', attemptId)
    return
  }

  // Get quiz questions - fetch from API to ensure we have full data
  let quizQuestions = []
  try {
    const res = await api.getQuizQuestions(quizId)
    quizQuestions = res.data?.questions || res.questions || []
    
    // Nếu không có, thử lấy từ quiz.value và transform
    if (quizQuestions.length === 0 && quiz.value?.questions) {
      // Transform từ cấu trúc backend (có content và answers array)
      quizQuestions = quiz.value.questions.map(q => {
        // Nếu đã có format đúng (từ getQuizQuestions API)
        if (q.question && q.options) {
          return q
        }
        // Transform từ format backend
        const options = q.answers ? q.answers.map(a => a.option) : []
        const correctIndex = options.findIndex(opt => opt === q.correct)
        return {
          id: q.id,
          question: q.content || q.question,
          options: options,
          correct: q.correct,
          correctIndex: correctIndex >= 0 ? correctIndex : -1
        }
      })
    }
  } catch (err) {
    console.error('Error fetching quiz questions:', err)
    error.value = 'Failed to load quiz questions'
    return
  }
  
  if (quizQuestions.length === 0) {
    error.value = 'No questions found for this quiz'
    return
  }
  
  // Debug: log để kiểm tra dữ liệu
  console.log('Quiz questions:', quizQuestions)
  console.log('Attempt:', attempt)
  
  // Get answers from attempt - answers có thể là JSON string hoặc array
  let attemptAnswers = []
  if (attempt.answers) {
    if (typeof attempt.answers === 'string') {
      try {
        attemptAnswers = JSON.parse(attempt.answers)
      } catch (e) {
        console.error('Failed to parse answers:', e)
      }
    } else if (Array.isArray(attempt.answers)) {
      attemptAnswers = attempt.answers
    }
  }
  console.log('Attempt answers:', attemptAnswers)
  
  // Transform data for the modal
  const transformedQuestions = quizQuestions.map((q, index) => {
    // Tìm answer tương ứng với question này (theo index hoặc questionId)
    let answer = attemptAnswers[index]
    if (!answer && q.id) {
      // Thử tìm theo questionId
      answer = attemptAnswers.find(a => a.questionId === q.id)
    }
    
    // Lấy đáp án đã chọn - format từ backend: { selected: ..., isCorrect: ..., questionId: ... }
    let selectedAnswer = null
    if (answer) {
      if (typeof answer === 'string') {
        selectedAnswer = answer
      } else if (answer.selected !== undefined && answer.selected !== null) {
        selectedAnswer = answer.selected
      } else if (answer.answer !== undefined) {
        selectedAnswer = answer.answer
      }
    }
    
    // Lấy options từ question - đã được transform từ API
    const options = q.options || []
    const isShortAnswer = !options || options.length === 0
    
    // For short answer questions
    if (isShortAnswer) {
      const correctAnswer = q.correct || ''
      const userAnswer = selectedAnswer || ''
      
      // Use isCorrect from answer object if available (from backend), otherwise calculate
      let isCorrect = false
      
      console.log(`Short answer question ${index + 1}:`, {
        answer,
        answerType: typeof answer,
        hasIsCorrect: answer && typeof answer === 'object' ? answer.isCorrect !== undefined : false,
        userAnswer,
        correctAnswer,
        rawQuestion: q
      })
      
      if (answer && typeof answer === 'object' && answer.isCorrect !== undefined) {
        isCorrect = Boolean(answer.isCorrect)
        console.log(`Using isCorrect from answer object: ${isCorrect}`)
      } else {
        // Fallback: So sánh đáp án (case-insensitive, trim)
        // Normalize: trim, lowercase, and remove any control characters
        const normalize = (str) => {
          return String(str || '')
            .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ') // Normalize whitespace
        }
        
        const userAns = normalize(userAnswer)
        const correctAns = normalize(correctAnswer)
        
        console.log(`Calculating isCorrect - User: "${userAns}" (raw: "${userAnswer}"), Correct: "${correctAns}" (raw: "${correctAnswer}")`)
        
        if (userAns && correctAns) {
          isCorrect = userAns === correctAns
        } else if (!userAns && !correctAns) {
          isCorrect = true // Both empty
        } else {
          isCorrect = false // One empty, one not
        }
        
        console.log(`Calculated isCorrect: ${isCorrect}`)
      }
      
      return {
        id: q.id || index,
        question: q.question || '',
        choices: [],
        correctIndex: -1,
        selectedIndex: -1,
        isCorrect: isCorrect,
        isShortAnswer: true,
        userAnswer: userAnswer,
        correctAnswer: correctAnswer
      }
    }
    
    // For multiple choice questions
    // Find the index of the correct answer in options array
    let correctIndex = -1
    if (q.correctIndex !== undefined && q.correctIndex !== null && q.correctIndex >= 0) {
      correctIndex = q.correctIndex
    } else if (q.correct && options.length > 0) {
      // Tìm đáp án đúng bằng cách so sánh giá trị
      correctIndex = options.findIndex(opt => {
        const optStr = String(opt).trim().toLowerCase()
        const correctStr = String(q.correct).trim().toLowerCase()
        return optStr === correctStr || opt === q.correct
      })
    }
    
    // Find the index of the selected answer in options array
    let selectedIndex = -1
    if (selectedAnswer !== null && selectedAnswer !== undefined && options.length > 0) {
      selectedIndex = options.findIndex(opt => {
        // So sánh nhiều cách để đảm bảo match
        const optStr = String(opt).trim().toLowerCase()
        const selectedStr = String(selectedAnswer).trim().toLowerCase()
        return opt === selectedAnswer || 
               optStr === selectedStr ||
               String(opt) === String(selectedAnswer)
      })
    }
    
    const isCorrect = selectedIndex !== -1 && correctIndex !== -1 && selectedIndex === correctIndex
    
    const transformed = {
      id: q.id || index,
      question: q.question || '',
      choices: options.length > 0 ? options : [],
      correctIndex: correctIndex,
      selectedIndex: selectedIndex,
      isCorrect: isCorrect,
      isShortAnswer: false
    }
    
    console.log(`Question ${index + 1}:`, {
      question: transformed.question,
      choices: transformed.choices,
      correctIndex: transformed.correctIndex,
      selectedIndex: transformed.selectedIndex,
      isCorrect: transformed.isCorrect,
      selectedAnswer,
      correctAnswer: options[correctIndex],
      rawAnswer: answer,
      rawQuestion: q
    })
    
    return transformed
  })
  
  reviewQuestions.value = transformedQuestions
  reviewMaxScore.value = quizQuestions.length || 0
  
  // Calculate score - attempt.score might be a percentage (0-100) or a count
  // If it's > maxScore, treat it as percentage, otherwise as count
  const scoreValue = attempt.score || 0
  if (reviewMaxScore.value > 0 && scoreValue > reviewMaxScore.value) {
    // It's a percentage, convert to count
    reviewScore.value = Math.round((scoreValue / 100) * reviewMaxScore.value)
  } else {
    // It's already a count, or calculate from correct answers
    reviewScore.value = scoreValue > 0 ? scoreValue : transformedQuestions.filter(q => q.isCorrect).length
  }
  
  console.log('Final transformed questions:', reviewQuestions.value)
  console.log('Score:', reviewScore.value, '/', reviewMaxScore.value)
  
  showAnswerModal.value = true
}

function editQuiz() {
  router.push({
    name: 'create-manual',
    query: { edit: quizId }
  })
}

function askDelete() {
  confirmModalInstance = new Modal(document.getElementById('confirmDeleteModal'))
  confirmModalInstance.show()
}

async function confirmDelete() {
  try {
    const userStr = localStorage.getItem('auth_user')
    if (!userStr) {
      error.value = 'Please login to delete quiz'
      return
    }

    const user = JSON.parse(userStr)
    await api.deleteQuiz(quizId, user.id)
    
    // Redirect to dashboard after successful delete
    router.push('/quizdash')
  } catch (err) {
    console.error('Error deleting quiz:', err)
    error.value = err.message || 'Failed to delete quiz'
    if (confirmModalInstance) {
      confirmModalInstance.hide()
    }
  }
}

const stats = computed(() => {
  if (!statistics.value) return []
  
  return [
    { 
      label: 'Total Attempts', 
      value: statistics.value.totalAttempts || 0 
    },
    // { 
    //   label: 'Time Limit', 
    //   value: statistics.value.timeLimit ? `${statistics.value.timeLimit} min` : 'Unlimited' 
    // },
    { 
      label: 'Average Score', 
      value: statistics.value.averageScore ? `${statistics.value.averageScore.toFixed(1)}%` : '0%' 
    },
    { 
      label: 'Top Score', 
      value: statistics.value.topScore ? `${statistics.value.topScore.toFixed(1)}%` : '0%' 
    }
  ]
})

onMounted(async () => {
  try {
    loading.value = true
    error.value = ''
    
    // Get user from localStorage
    const userStr = localStorage.getItem('auth_user')
    if (!userStr) {
      error.value = 'Please login to view quiz details'
      loading.value = false
      return
    }

    const user = JSON.parse(userStr)
    const res = await api.getQuizDetail(quizId, user.id)
    
    quiz.value = res.data?.quiz || res.quiz
    attempts.value = res.data?.attempts || res.attempts || []
    statistics.value = res.data?.statistics || res.statistics || {
      totalAttempts: 0,
      averageScore: 0,
      topScore: 0,
      timeLimit: null
    }
  } catch (err) {
    console.error('Error loading quiz detail:', err)
    error.value = err.message || 'Failed to load quiz detail'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container py-4 py-md-5">
    <!-- Loading state -->
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="alert alert-danger" role="alert">
      {{ error }}
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Header -->
      <div class="d-flex flex-wrap justify-content-between align-items-start mb-4 position-relative">
        <!-- Tiêu đề quiz -->
        <h2 class="quiz-title-break pe-5">
          <strong>{{ quiz?.title || 'Quiz Detail' }}</strong>
        </h2>

        <!-- Nút ở góc phải -->
        <div class="btn-group-quiz ms-auto mt-2 mt-md-0 d-flex gap-2">
          <button class="btn btn-outline-secondary" @click="router.push('/quizdash')">Back to Dashboard</button>
          <button class="btn btn-outline-primary" @click="editQuiz">Edit</button>
          <button class="btn btn-danger" @click="askDelete">Delete</button>
        </div>
      </div>



      <!-- Summary Statistics -->
      <div class="row g-4 mb-4">
        <div class="col-12 col-md-6 col-lg-3" v-for="stat in stats" :key="stat.label">
          <div class="stat-card">
            <h6 class="stat-label">{{ stat.label }}</h6>
            <h3 class="stat-value">{{ stat.value }}</h3>
          </div>
        </div>
      </div>

      <!-- Attempt History Table -->
      <div class="card">
        <div class="card-header">
          <h5 class="mb-0">Attempt History</h5>
        </div>
        <div class="card-body p-0">
          <div class="table-responsive">
            <table class="table table-hover mb-0">
              <thead class="table-light">
                <tr>
                  <th>#</th>
                  <th>Date & Time</th>
                  <th>Score</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="attempts.length === 0">
                  <td colspan="4" class="text-center text-muted py-4">
                    No attempts yet. Start the quiz to see your results here!
                  </td>
                </tr>
                <tr v-for="(attempt, index) in attempts" :key="attempt.id">
                  <td>{{ attempts.length - index }}</td>
                  <td>{{ formatDate(attempt.createdAt) }}</td>
                  <td>
                    <strong :class="getScoreClass(attempt.score)">
                      {{ attempt.score ? attempt.score.toFixed(1) : 0 }}%
                    </strong>
                  </td>
                  <td>
                    <button 
                      class="btn btn-sm btn-outline-primary" 
                      @click="viewAttempt(attempt.id)"
                    >
                      View
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Delete Modal -->
    <div class="modal fade" id="confirmDeleteModal" tabindex="-1" aria-labelledby="confirmDeleteLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="confirmDeleteLabel">Confirm Delete</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            Are you sure you want to delete this quiz? This action cannot be undone.
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-danger" @click="confirmDelete">Delete</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Answer Review Modal -->
    <AnswerReviewModal
      :show="showAnswerModal"
      :questions="reviewQuestions"
      :score="reviewScore"
      :maxScore="reviewMaxScore"
      @update:show="showAnswerModal = $event"
    />
  </div>
</template>

<style scoped>
.stat-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-label {
  color: #6c757d;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.stat-value {
  color: #16305c;
  font-size: 32px;
  font-weight: 700;
  margin: 0;
}

.card {
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  padding: 16px 20px;
}

.card-header h5 {
  color: #16305c;
  font-weight: 700;
  margin: 0;
}

.table th {
  font-weight: 600;
  color: #16305c;
  border-bottom: 2px solid #dee2e6;
  padding: 12px 16px;
}

.table td {
  padding: 12px 16px;
  vertical-align: middle;
}

.text-success {
  color: #16c172 !important;
}

.text-warning {
  color: #ffc107 !important;
}

.text-danger {
  color: #dc3545 !important;
}

.quiz-title-break {
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: normal;
  max-width: 100%;
}

.btn-group-quiz {
  flex-shrink: 0;
}
</style>
