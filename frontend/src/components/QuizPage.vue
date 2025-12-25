<template>
  <div class="quiz-container p-4">
    <!-- Loading state -->
    <div v-if="loading" class="w-100 text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3 text-muted">Loading quiz...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="w-100 text-center py-5">
      <div class="alert alert-danger">
        <h5>Error</h5>  
        <p>{{ error }}</p>
        <button class="btn btn-primary" @click="loadQuiz">Try again</button>
      </div>
    </div>

    <!-- Quiz content -->
    <template v-else-if="questions.length > 0">
      <div class="row g-4 align-items-start">
        <!-- Câu hỏi -->
        <div class="quiz-main col-12 col-xl-9">
          <div class="quiz-card shadow-sm">
            <div class="quiz-header d-flex flex-wrap align-items-start justify-content-between gap-3">
              <div class="question-heading">
                <p class="text-muted fw-semibold small mb-1">
                  Question {{ currentIndex + 1 }} of {{ questions.length }}
                </p>
                <h3 class="fw-bold mb-0 question-title text-balance">
                  {{ currentQuestion.question }}
                </h3>
              </div>
              <span class="badge rounded-pill bg-light text-dark border">
                {{ isShortAnswer ? 'Short answer' : 'Multiple choice' }}
              </span>
            </div>

            <div class="quiz-body">
              <!-- Multiple Choice Options -->
              <div v-if="!isShortAnswer && currentQuestion.options && currentQuestion.options.length > 0" class="option-stack">
                <div v-for="(option, idx) in currentQuestion.options" :key="idx">
                  <button
                    class="option-btn w-100 text-start rounded border"
                    :class="{
                      'selected': selectedOption === option,
                      'correct': submitted && option === currentQuestion.correct && selectedOption === option,
                      'incorrect': submitted && selectedOption === option && option !== currentQuestion.correct
                    }"
                    @click="selectOption(option)"
                    :disabled="submitted"
                  >
                    <strong class="me-2">{{ String.fromCharCode(65 + idx) }}.</strong>
                    <span class="option-text">{{ option }}</span>
                  </button>
                </div>
              </div>

              <!-- Short Answer Input -->
              <div v-else-if="isShortAnswer" class="short-answer-card">
                <label class="form-label text-muted small mb-2">Your answer</label>
                <textarea
                  v-model="shortAnswerText"
                  class="form-control"
                  rows="4"
                  placeholder="Enter your answer here..."
                  :disabled="submitted"
                ></textarea>
                <div v-if="quizSubmitted && currentQuestion.userAnswer" class="mt-3 p-3 rounded" 
                     :class="currentQuestion.isCorrect ? 'bg-light-success border border-success' : 'bg-light-danger border border-danger'">
                  <div class="d-flex justify-content-between align-items-start mb-2">
                    <strong>Your answer:</strong>
                    <span v-if="currentQuestion.isCorrect === true" class="text-success">✓ Correct</span>
                    <span v-else class="text-danger">✗ Incorrect</span>
                  </div>
                  <p class="mb-1">{{ currentQuestion.userAnswer }}</p>
                  <div v-if="currentQuestion.isCorrect === false && currentQuestion.correct" class="mt-2">
                    <strong>Correct answer:</strong>
                    <p class="mb-0">{{ currentQuestion.correct }}</p>
                  </div>
                </div>
              </div>

              <div class="quiz-actions">
                <div class="d-flex flex-wrap gap-2">
                  <button
                    v-if="currentIndex > 0"
                    class="btn btn-outline-secondary rounded-pill px-4 py-2"
                    @click="goTo(currentIndex - 1)"
                  >
                    ← Previous question
                  </button>
                  <button
                    class="btn btn-success rounded-pill px-4 py-2"
                    @click="submitAnswer"
                    :disabled="submitted || (!selectedOption && !shortAnswerText.trim())"
                  >
                    {{ submitted ? 'Submitted' : 'Submit answer' }}
                  </button>
                  <button
                    v-if="currentIndex < questions.length - 1"
                    class="btn btn-primary rounded-pill px-4 py-2"
                    @click="goTo(currentIndex + 1)"
                    :disabled="!submitted"
                  >
                    Next question →
                  </button>
                </div>

                <!-- Submit all button -->
                <div v-if="allAnswered && !quizSubmitted" class="mt-3">
                  <button
                    class="btn btn-primary btn-lg w-100 rounded-pill py-3"
                    @click="submitAllAnswers"
                    :disabled="submitting"
                  >
                    {{ submitting ? 'Đang nộp...' : 'Nộp toàn bộ bài làm' }}
                  </button>
                </div>
              </div>

              <!-- Results -->
              <div v-if="quizSubmitted && result" class="result-card">
                <div>
                  <p class="text-muted small mb-1">Quiz completed</p>
                  <h4 class="fw-bold mb-3">Result</h4>
                  <p class="fs-5 mb-1">
                    Score: <strong>{{ result.score }}%</strong>
                  </p>
                  <p class="mb-3">
                    Correct answers: <strong>{{ result.correctCount }}/{{ result.totalQuestions }}</strong>
                  </p>
                </div>
                
                <!-- Action buttons after quiz completion -->
                <div class="d-flex gap-2">
                  <button
                    class="btn btn-outline-secondary flex-grow-1"
                    @click="goToDashboard"
                  >
                    Back to Dashboard
                  </button>
                  <button
                    class="btn btn-primary flex-grow-1"
                    @click="goToDetail"
                  >
                    Detail
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="quiz-sidebar col-12 col-xl-3">
          <div class="sidebar-card shadow-sm">
            <div class="timer-box text-center">
              <div class="timer-circle mb-2">
                <div class="circle">∞</div>
              </div>
              <div class="small text-muted">Timer: <strong>Unlimited</strong></div>
            </div>
  
            <div class="question-list">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="fw-bold mb-0">Quiz Questions List</h6>
                <span class="text-muted">⌃</span>
              </div>
              <div class="question-items">
                <div
                  v-for="(q, index) in questions"
                  :key="index"
                  class="question-item mb-2 rounded p-2"
                  :class="getQuestionItemClass(q, index)"
                  @click="goTo(index)"
                >
                  <div class="d-flex justify-content-between align-items-center">
                    <span class="question-number">Quiz question {{ index + 1 }}</span>
                    <span v-if="quizSubmitted && q.userAnswer" class="status-icon">
                      <span v-if="q.isCorrect" class="text-success">✓</span>
                      <span v-else class="text-danger">✗</span>
                    </span>
                    <span v-else-if="q.userAnswer && !quizSubmitted" class="status-icon">
                      <span class="text-primary">○</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../services/api'
import { auth } from '../services/auth.service'

const route = useRoute()
const router = useRouter()
const quizId = route.params.id

const questions = reactive([])
const loading = ref(true)
const error = ref('')
const currentIndex = ref(0)
const selectedOption = ref('')
const shortAnswerText = ref('') // For short_answer questions
const submitted = ref(false)
const quizSubmitted = ref(false)
const submitting = ref(false)
const result = ref(null)

const currentQuestion = computed(() => questions[currentIndex.value] || {})
const allAnswered = computed(() => questions.every(q => q.userAnswer))
const isShortAnswer = computed(() => {
  const q = currentQuestion.value
  // Check if question has no options or empty options array (short_answer)
  return !q.options || q.options.length === 0
})

function getQuestionItemClass(q, index) {
  if (currentIndex.value === index) {
    return 'question-item-active'
  }
  if (quizSubmitted.value && q.userAnswer) {
    return q.isCorrect ? 'question-item-completed-correct' : 'question-item-completed-incorrect'
  }
  if (q.userAnswer && !quizSubmitted.value) {
    return 'question-item-answered'
  }
  return 'question-item-default'
}

async function loadQuiz() {
  loading.value = true
  error.value = ''
  
  try {
    const res = await api.getQuizQuestions(quizId)
    if (res.data && res.data.questions) {
      // Format questions for component
      questions.splice(0, questions.length, ...res.data.questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correct: q.correct,
        correctIndex: q.correctIndex,
        userAnswer: null
      })))
    } else {
      error.value = 'Không tìm thấy câu hỏi'
    }
  } catch (err) {
    error.value = err.message || 'Không thể tải quiz'
    console.error('Error loading quiz:', err)
  } finally {
    loading.value = false
  }
}

function selectOption(option) {
  if (!submitted.value && !quizSubmitted.value) {
    selectedOption.value = option
  }
}

function submitAnswer() {
  if (submitted.value) return
  
  // For short answer, use shortAnswerText; for multiple choice, use selectedOption
  const answer = isShortAnswer.value ? shortAnswerText.value.trim() : selectedOption.value
  
  if (!answer) return
  
  currentQuestion.value.userAnswer = answer
  submitted.value = true
  
  // Auto move to next question after 1 second
  setTimeout(() => {
    if (currentIndex.value < questions.length - 1) {
      goTo(currentIndex.value + 1)
    }
  }, 1000)
}

function goTo(index) {
  if (index < 0 || index >= questions.length) return
  
  currentIndex.value = index
  const q = questions[index]
  
  // Set selectedOption or shortAnswerText based on question type
  if (!q.options || q.options.length === 0) {
    // Short answer
    shortAnswerText.value = q.userAnswer || ''
    selectedOption.value = ''
  } else {
    // Multiple choice
    selectedOption.value = q.userAnswer || ''
    shortAnswerText.value = ''
  }
  
  submitted.value = !!q.userAnswer
}

async function submitAllAnswers() {
  if (!allAnswered.value || submitting.value) return
  
  submitting.value = true
  
  try {
    const user = auth.currentUser()
    if (!user || !user.id) {
      error.value = 'Vui lòng đăng nhập'
      return
    }

    // Format answers for API
    const answers = questions.map(q => ({
      selected: q.userAnswer
    }))

    const res = await api.submitQuizAttempt(quizId, user.id, answers)
    
    if (res.data) {
      // Mark correct/incorrect for each question using backend response
      // Backend returns formattedAnswers with isCorrect flag
      const formattedAnswers = res.data.formattedAnswers || []
      
      questions.forEach((q, index) => {
        if (q.userAnswer) {
          // Use isCorrect from backend if available, otherwise calculate
          const answerResult = formattedAnswers[index]
          console.log(`QuizPage processing question ${index + 1}:`, {
            hasAnswerResult: !!answerResult,
            answerResult,
            userAnswer: q.userAnswer,
            correct: q.correct,
            options: q.options
          })
          
          if (answerResult && answerResult.isCorrect !== undefined) {
            q.isCorrect = Boolean(answerResult.isCorrect)
            console.log(`Using isCorrect from backend: ${q.isCorrect}`)
          } else {
          // Fallback: compare answers (case-insensitive for short answer)
          const isShortAnswer = !q.options || q.options.length === 0
          if (isShortAnswer) {
            // Normalize function same as backend
            const normalize = (str) => {
              return String(str || '')
                .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
                .trim()
                .toLowerCase()
                .replace(/\s+/g, ' ') // Normalize whitespace
            }
            
            const userAns = normalize(q.userAnswer)
            const correctAns = normalize(q.correct)
            
            console.log(`QuizPage fallback comparison - User: "${userAns}" (raw: "${q.userAnswer}"), Correct: "${correctAns}" (raw: "${q.correct}")`)
            
            if (userAns && correctAns) {
              q.isCorrect = userAns === correctAns
            } else if (!userAns && !correctAns) {
              q.isCorrect = true // Both empty
            } else {
              q.isCorrect = false // One empty, one not
            }
            
            console.log(`QuizPage fallback isCorrect: ${q.isCorrect}`)
          } else {
            q.isCorrect = q.userAnswer === q.correct
          }
          }
        }
      })
      
      result.value = {
        score: res.data.score,
        correctCount: res.data.correctCount,
        totalQuestions: res.data.totalQuestions
      }
      quizSubmitted.value = true
    }
  } catch (err) {
    error.value = err.message || 'Không thể nộp bài'
    console.error('Error submitting quiz:', err)
  } finally {
    submitting.value = false
  }
}

function goToDashboard() {
  router.push('/quizdash')
}

function goToDetail() {
  router.push(`/quiz/${quizId}/detail`)
}

onMounted(() => {
  if (!auth.isAuthenticated()) {
    router.push({ name: 'home', query: { login: '1', redirect: route.fullPath } })
    return
  }
  loadQuiz()
})
</script>

<style scoped>
.quiz-container {
  max-width: 1300px;
  margin: 0 auto;
}

.quiz-card {
  background: #fff;
  border-radius: 18px;
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.quiz-header {
  border-bottom: 1px solid #eef2f7;
  padding-bottom: 12px;
}

.question-heading {
  flex: 1;
  min-height: 86px;
}

.question-title {
  line-height: 1.4;
  display: flex;
  align-items: center;
}

.text-balance {
  text-wrap: balance;
}

@supports (text-wrap: balance) {
  .question-title {
    text-wrap: balance;
  }
}

.quiz-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 380px;
}

.option-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-btn {
  background-color: #f8f9fa;
  border-color: #d8dde6;
  transition: 0.2s;
  padding: 16px 18px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-height: 64px;
  line-height: 1.5;
}

.option-btn:hover:not(:disabled) {
  background-color: #eef2f8;
}

.option-btn:disabled {
  cursor: not-allowed;
}

.option-text {
  flex: 1;
}

.selected {
  border: 2px solid #0d6efd;
  background-color: #e7f1ff;
}

.correct {
  background-color: #d1e7dd !important;
  border-color: #198754 !important;
}

.incorrect {
  background-color: #f8d7da !important;
  border-color: #dc3545 !important;
}

.bg-light-success {
  background-color: #d4edda;
}

.bg-light-danger {
  background-color: #f8d7da;
}

.short-answer-card {
  background: #f8f9fb;
  border: 1px solid #e5e8ee;
  border-radius: 12px;
  padding: 16px;
}

.quiz-actions {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid #eef2f7;
}

.result-card {
  border: 1px solid #e5e8ee;
  border-radius: 12px;
  padding: 16px;
  background-color: #f9fbff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.sidebar-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  position: sticky;
  top: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.timer-box {
  border: 1px solid #e5e8ee;
  border-radius: 12px;
  padding: 16px;
  background-color: #f8f9fb;
}

.timer-box .circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 4px solid #198754;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 18px;
  margin: 0 auto;
}

.quiz-link {
  cursor: pointer;
}

.quiz-link:hover {
  text-decoration: underline;
}

.active .quiz-link {
  font-weight: bold;
  color: #0d6efd !important;
}

/* Question list styles */
.question-list {
  background: #fff;
}

.question-items {
  max-height: 520px;
  overflow-y: auto;
  padding-right: 4px;
}

.question-item {
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.question-item:hover {
  background-color: #f8f9fa !important;
}

.question-item-default {
  background-color: #ffffff;
  border-color: #e9ecef;
}

.question-item-answered {
  background-color: #e7f3ff;
  border-color: #b3d9ff;
}

.question-item-completed-correct {
  background-color: #d1e7dd;
  border-color: #badbcc;
}

.question-item-completed-incorrect {
  background-color: #f8d7da;
  border-color: #f5c2c7;
}

.question-item-active {
  background-color: #cfe2ff !important;
  border-color: #9ec5fe !important;
  font-weight: 600;
}

.question-number {
  font-size: 0.9rem;
  color: #16305c;
}

.status-icon {
  font-size: 1.2rem;
  font-weight: bold;
  min-width: 24px;
  text-align: center;
}

.quiz-main,
.quiz-sidebar {
  min-height: 400px;
}

</style>
