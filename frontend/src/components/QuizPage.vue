<template>
  <div class="quiz-container d-flex flex-wrap justify-content-between p-4">
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
      <div class="row g-4 align-items-stretch min-vh-50">
        <!-- Câu hỏi -->
        <div class="quiz-main col-12 col-md-9 h-100 d-flex flex-column mx-4">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h3 class="fw-bold mb-0">
              {{ currentQuestion.question }}
            </h3>
            <!-- <span class="badge bg-primary">Question {{ currentIndex + 1 }}/{{ questions.length }}</span> -->
          </div>
  
          <!-- Multiple Choice Options -->
          <div v-if="!isShortAnswer && currentQuestion.options && currentQuestion.options.length > 0">
            <div v-for="(option, idx) in currentQuestion.options" :key="idx" class="mb-3">
              <button
                class="option-btn w-100 text-start py-3 px-4 rounded border"
                :class="{
                  'selected': selectedOption === option,
                  'correct': submitted && option === currentQuestion.correct && selectedOption === option,
                  'incorrect': submitted && selectedOption === option && option !== currentQuestion.correct
                }"
                @click="selectOption(option)"
                :disabled="submitted"
              >
                <strong>{{ String.fromCharCode(65 + idx) }}.</strong> {{ option }}
              </button>
            </div>
          </div>

          <!-- Short Answer Input -->
          <div v-else-if="isShortAnswer" class="mb-3">
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
  
          <div class="d-flex gap-2 mt-3">
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
          <div v-if="allAnswered && !quizSubmitted" class="mt-4">
            <button
              class="btn btn-primary btn-lg w-100 rounded-pill py-3"
              @click="submitAllAnswers"
              :disabled="submitting"
            >
              {{ submitting ? 'Đang nộp...' : 'Nộp toàn bộ bài làm' }}
            </button>
          </div>
  
          <!-- Results -->
          <div v-if="quizSubmitted && result" class="mt-4 p-4 border rounded">
            <h4 class="fw-bold mb-3">Result</h4>
            <p class="fs-5">
              Score: <strong>{{ result.score }}%</strong>
            </p>
            <p>
              Correct answers: <strong>{{ result.correctCount }}/{{ result.totalQuestions }}</strong>
            </p>
            
            <!-- Action buttons after quiz completion -->
            <div class="d-flex gap-2 mt-4">
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
  
        <!-- Sidebar -->
        <div class="quiz-sidebar col-12 col-md-2">
          <div class="timer-box text-center mb-4">
            <div class="timer-circle mb-2">
              <div class="circle">∞</div>
            </div>
            <div class="small text-muted">Timer: <strong>Unlimited</strong></div>
          </div>
  
          <div class="question-list border rounded p-3">
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
.option-btn {
  background-color: #f8f9fa;
  border-color: #ccc;
  transition: 0.2s;
}
.option-btn:hover:not(:disabled) {
  background-color: #e9ecef;
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
  max-height: 500px;
  overflow-y: auto;
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
