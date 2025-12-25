<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api } from '@/services/api'

const router = useRouter()
const route = useRoute()

const quizName = ref('')
const visibility = ref('private')
const editingQuizId = ref(null)
const loadingQuiz = ref(false)

const showAnswers = ref(true)
const shuffleQuestions = ref(false)
const timeLimit = ref(false)
const timeLimitHours = ref(null)
const timeLimitMinutes = ref(null)
const requireName = ref(false)
const requireEmail = ref(false)

// Saving state
const saving = ref(false)
const saved = ref(false)
const savedQuizId = ref(null)
const errorMessage = ref('')
const saveProgress = ref(0)

// Questions array
const questions = ref([
  {
    id: 1,
    questionType: 'multiple_choice',
    questionText: '',
    options: [
      { id: 1, text: 'A' },
      { id: 2, text: 'B' },
      { id: 3, text: 'C' },
      { id: 4, text: 'D' },
    ],
    correctOptionId: 1,
    answer: '' // For short_answer type
  }
])

const currentQuestionIndex = ref(0)

// Computed để lấy question hiện tại
const currentQuestion = computed(() => questions.value[currentQuestionIndex.value])

function setCorrect(id) {
  currentQuestion.value.correctOptionId = id
}

function deleteOption(optionId) {
  const question = currentQuestion.value
  // Đảm bảo ít nhất có 2 options
  if (question.options.length <= 2) {
    return
  }
  
  // Xóa option
  const index = question.options.findIndex(opt => opt.id === optionId)
  if (index !== -1) {
    question.options.splice(index, 1)
    
    // Nếu option bị xóa là option đang được chọn là đúng, chọn option đầu tiên
    if (question.correctOptionId === optionId) {
      question.correctOptionId = question.options[0]?.id || 1
    }
  }
}

function addOption() {
  const question = currentQuestion.value
  // Tìm ID lớn nhất và tăng thêm 1
  const maxId = question.options.length > 0 
    ? Math.max(...question.options.map(opt => opt.id)) 
    : 0
  
  // Thêm option mới
  question.options.push({
    id: maxId + 1,
    text: ''
  })
}

function addQuestion() {
  // Tìm ID lớn nhất cho question và option
  const maxQuestionId = questions.value.length > 0 
    ? Math.max(...questions.value.map(q => q.id)) 
    : 0
  
  const newQuestion = {
    id: maxQuestionId + 1,
    questionType: 'multiple_choice',
    questionText: '',
    options: [
      { id: 1, text: 'A' },
      { id: 2, text: 'B' },
    ],
    correctOptionId: 1,
    answer: '' // For short_answer type
  }
  
  questions.value.push(newQuestion)
  currentQuestionIndex.value = questions.value.length - 1
}

function selectQuestion(index) {
  currentQuestionIndex.value = index
}

function deleteQuestion(index) {
  // Đảm bảo ít nhất có 1 question
  if (questions.value.length <= 1) {
    return
  }
  
  questions.value.splice(index, 1)
  
  // Nếu xóa question hiện tại hoặc question trước đó, chuyển về question đầu tiên
  if (currentQuestionIndex.value >= questions.value.length) {
    currentQuestionIndex.value = questions.value.length - 1
  } else if (currentQuestionIndex.value > index) {
    currentQuestionIndex.value--
  }
}

function onQuestionTypeChange() {
  const question = currentQuestion.value
  // Initialize answer field if switching to short_answer and it doesn't exist
  if (question.questionType === 'short_answer' && question.answer === undefined) {
    question.answer = ''
  }
  // Initialize options if switching to multiple_choice and they don't exist
  if (question.questionType === 'multiple_choice' && (!question.options || question.options.length === 0)) {
    question.options = [
      { id: 1, text: 'A' },
      { id: 2, text: 'B' },
    ]
    question.correctOptionId = 1
  }
}

function validateQuiz() {
  errorMessage.value = ''
  
  // Validate quiz name
  if (!quizName.value || !quizName.value.trim()) {
    errorMessage.value = 'Quiz name is required'
    return false
  }
  
  // Validate questions
  if (questions.value.length === 0) {
    errorMessage.value = 'At least one question is required'
    return false
  }
  
  // Validate each question
  for (let i = 0; i < questions.value.length; i++) {
    const q = questions.value[i]
    
    // Check question text
    if (!q.questionText || !q.questionText.trim()) {
      errorMessage.value = `Question ${i + 1}: Question text is required`
      return false
    }
    
    // Validate based on question type
    if (q.questionType === 'multiple_choice') {
      // Check if options exist and have at least 2
      if (!q.options || q.options.length < 2) {
        errorMessage.value = `Question ${i + 1}: At least 2 options are required`
        return false
      }
      
      // Check if all options have text
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].text || !q.options[j].text.trim()) {
          errorMessage.value = `Question ${i + 1}: Option ${String.fromCharCode(65 + j)} text is required`
          return false
        }
      }
      
      // Check if correct option is selected
      if (!q.correctOptionId) {
        errorMessage.value = `Question ${i + 1}: Please select the correct answer`
        return false
      }
    } else if (q.questionType === 'short_answer') {
      // Check if answer exists
      if (!q.answer || !q.answer.trim()) {
        errorMessage.value = `Question ${i + 1}: Correct answer is required`
        return false
      }
    }
  }
  
  return true
}

async function createQuiz() {
  // Validate quiz
  if (!validateQuiz()) {
    return
  }
  
  saving.value = true
  saveProgress.value = 0
  errorMessage.value = ''
  
  try {
    // Get user from localStorage
    const userStr = localStorage.getItem('auth_user')
    if (!userStr) {
      errorMessage.value = 'Please login to create quiz'
      saving.value = false
      return
    }
    
    const user = JSON.parse(userStr)
    saveProgress.value = 20
    
    // Format questions for API
    const formattedQuestions = questions.value.map(q => {
      if (q.questionType === 'multiple_choice') {
        // Get correct option text
        const correctOption = q.options.find(opt => opt.id === q.correctOptionId)
        const choices = q.options.map(opt => opt.text.trim())
        
        return {
          question: q.questionText.trim(),
          choices: choices,
          answer: correctOption ? correctOption.text.trim() : ''
        }
      } else if (q.questionType === 'short_answer') {
        return {
          question: q.questionText.trim(),
          choices: [],
          answer: q.answer.trim()
        }
      }
      return null
    }).filter(q => q !== null)
    
    saveProgress.value = 60
    
    // Save or update quiz
    let res
    if (editingQuizId.value) {
      // Update existing quiz
      res = await api.updateQuiz(editingQuizId.value, user.id, quizName.value.trim(), formattedQuestions)
      savedQuizId.value = editingQuizId.value
    } else {
      // Create new quiz
      res = await api.saveQuiz(user.id, quizName.value.trim(), formattedQuestions)
      
      // Get quiz ID from response
      if (res.data && res.data.quiz && res.data.quiz.id) {
        savedQuizId.value = res.data.quiz.id
      } else if (res.quiz && res.quiz.id) {
        savedQuizId.value = res.quiz.id
      } else if (res.id) {
        savedQuizId.value = res.id
      }
    }
    
    saveProgress.value = 100
    saved.value = true
  } catch (err) {
    console.error('Error creating quiz:', err)
    errorMessage.value = err.message || 'Failed to create quiz'
  } finally {
    saving.value = false
  }
}

function startQuiz() {
  if (savedQuizId.value) {
    router.push(`/quiz/${savedQuizId.value}`)
  }
}

async function loadQuizForEdit(quizId) {
  loadingQuiz.value = true
  errorMessage.value = ''
  
  try {
    // Get quiz questions
    const questionsRes = await api.getQuizQuestions(quizId)
    const quizQuestions = questionsRes.data?.questions || questionsRes.questions || []
    
    // Get quiz info
    const quizRes = await api.getQuiz(quizId)
    const quiz = quizRes.data?.quiz || quizRes.quiz || quizRes
    
    // Set quiz name
    if (quiz.title) {
      quizName.value = quiz.title
    }
    
    // Transform questions from API format to component format
    const transformedQuestions = quizQuestions.map((q, index) => {
      const options = q.options || []
      const isShortAnswer = options.length === 0
      
      if (isShortAnswer) {
        // Short answer question
        return {
          id: q.id || index + 1,
          questionType: 'short_answer',
          questionText: q.question || '',
          options: [],
          correctOptionId: null,
          answer: q.correct || ''
        }
      } else {
        // Multiple choice question
        // Find correct option index
        const correctAnswer = q.correct || ''
        let correctOptionId = 1
        const optionObjects = options.map((opt, optIdx) => {
          const optText = String(opt).trim()
          if (optText.toLowerCase() === correctAnswer.toLowerCase()) {
            correctOptionId = optIdx + 1
          }
          return {
            id: optIdx + 1,
            text: optText
          }
        })
        
        return {
          id: q.id || index + 1,
          questionType: 'multiple_choice',
          questionText: q.question || '',
          options: optionObjects,
          correctOptionId: correctOptionId,
          answer: ''
        }
      }
    })
    
    if (transformedQuestions.length > 0) {
      questions.value = transformedQuestions
      currentQuestionIndex.value = 0
    }
    
    editingQuizId.value = quizId
  } catch (err) {
    console.error('Error loading quiz for edit:', err)
    errorMessage.value = err.message || 'Failed to load quiz for editing'
  } finally {
    loadingQuiz.value = false
  }
}

onMounted(async () => {
  // Check if editing
  const editId = route.query.edit
  if (editId) {
    await loadQuizForEdit(editId)
  }
})
</script>

<template>
  <div class="quiz-page">
    <div class="container-fluid py-3 py-md-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="mb-0 fw-bold text-primary-quiz">{{ editingQuizId ? 'Edit Quiz' : 'New Quiz' }}</h3>

        <button 
          class="btn btn-outline-primary rounded-pill px-4 fw-semibold"
          @click="createQuiz"
          :disabled="saving || saved || loadingQuiz"
        >
          {{ saving ? (editingQuizId ? 'Updating...' : 'Creating...') : saved ? (editingQuizId ? 'Updated' : 'Created') : (editingQuizId ? 'Update' : 'Create') }}
        </button>
      </div>

      <!-- Error message -->
      <div v-if="errorMessage" class="alert alert-danger mb-3" role="alert">
        {{ errorMessage }}
      </div>

      <!-- Progress bar -->
      <div v-if="saving" class="mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="small text-muted">Saving quiz...</span>
          <span class="small text-muted">{{ saveProgress }}%</span>
        </div>
        <div class="progress" style="height: 8px;">
          <div 
            class="progress-bar progress-bar-striped progress-bar-animated" 
            role="progressbar" 
            :style="{ width: saveProgress + '%' }"
          ></div>
        </div>
      </div>

      <!-- Success message and Start Quiz button -->
      <div v-if="saved" class="alert alert-success mb-3 d-flex justify-content-between align-items-center" role="alert">
        <span>{{ editingQuizId ? 'Quiz updated successfully!' : 'Quiz created successfully!' }}</span>
        <div class="d-flex gap-2">
          <button 
            class="btn btn-outline-secondary btn-sm"
            @click="router.push(`/quiz/${savedQuizId || editingQuizId}/detail`)"
          >
            View Detail
          </button>
          <button 
            class="btn btn-success btn-sm"
            @click="startQuiz"
          >
            Start Quiz
          </button>
        </div>
      </div>

      <!-- Loading quiz for edit -->
      <div v-if="loadingQuiz" class="alert alert-info mb-3" role="alert">
        <div class="d-flex align-items-center">
          <div class="spinner-border spinner-border-sm me-2" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          Loading quiz data...
        </div>
      </div>

      <div class="row g-3 g-lg-4">
        <!-- LEFT: OPTIONS -->
        <div class="col-12 col-lg-3">
          <div class="card options-card border-0 shadow-sm">
            <div class="card-body">
              <h6 class="fw-bold text-muted mb-3">Options</h6>

              <!-- Name -->
              <div class="mb-3">
                <label class="form-label small fw-semibold text-muted">Name</label>
                <input
                  v-model="quizName"
                  type="text"
                  class="form-control form-control-sm rounded-3 soft-input"
                  placeholder="Quiz name"
                />
              </div>

              <!-- Visibility -->
              <div class="mb-3">
                <label class="form-label small fw-semibold text-muted">Visibility</label>
                <select
                  v-model="visibility"
                  class="form-select form-select-sm rounded-3 soft-input"
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                  <option value="unlisted">Unlisted</option>
                </select>
              </div>

              <!-- Toggles -->
              <div class="form-check form-switch mb-2">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="showAnswers"
                  v-model="showAnswers"
                />
                <label class="form-check-label small" for="showAnswers">
                  Show Answers <span class="text-muted">ⓘ</span>
                </label>
              </div>

              <!-- <div class="form-check form-switch mb-2">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="shuffleQuestions"
                  v-model="shuffleQuestions"
                />
                <label class="form-check-label small" for="shuffleQuestions">
                  Shuffle Questions <span class="text-muted">ⓘ</span>
                </label>
              </div> -->

              <div class="form-check form-switch mb-2">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="timeLimit"
                  v-model="timeLimit"
                />
                <label class="form-check-label small" for="timeLimit">
                  Time Limit <span class="text-muted">ⓘ</span>
                </label>
              </div>

              <!-- Time Limit Input Fields -->
              <div v-if="timeLimit" class="mb-3">
                <div class="row g-2">
                  <div class="col-6">
                    <input
                      type="number"
                      v-model.number="timeLimitHours"
                      class="form-control form-control-sm rounded-3 soft-input"
                      placeholder="Hours"
                      min="0"
                    />
                  </div>
                  <div class="col-6">
                    <input
                      type="number"
                      v-model.number="timeLimitMinutes"
                      class="form-control form-control-sm rounded-3 soft-input"
                      placeholder="Minutes"
                      min="0"
                      max="59"
                    />
                  </div>
                </div>
              </div>

              <!-- <div class="form-check form-switch mb-2">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="requireName"
                  v-model="requireName"
                />
                <label class="form-check-label small" for="requireName">
                  Require Name <span class="text-muted">ⓘ</span>
                </label>
              </div> -->

              <!-- <div class="form-check form-switch mb-0">
                <input
                  class="form-check-input"
                  type="checkbox"
                  id="requireEmail"
                  v-model="requireEmail"
                />
                <label class="form-check-label small" for="requireEmail">
                  Require Email <span class="text-muted">ⓘ</span>
                </label>
              </div> -->
            </div>
          </div>
        </div>

        <!-- RIGHT: QUESTION BUILDER -->
        <div class="col-12 col-lg-9">
          <!-- Questions List -->
          <div class="mb-3 d-flex justify-content-between align-items-center">
            <div class="d-flex gap-2 flex-wrap">
              <button
                v-for="(q, index) in questions"
                :key="q.id"
                class="btn btn-sm"
                :class="currentQuestionIndex === index ? 'btn-primary' : 'btn-outline-secondary'"
                @click="selectQuestion(index)"
              >
                Question {{ index + 1 }}
              </button>
            </div>
            <button
              class="btn btn-primary btn-sm"
              @click="addQuestion"
              type="button"
            >
              + Add Question
            </button>
          </div>

          <div class="card border-0 shadow-sm question-card" v-if="currentQuestion">
            <div class="card-body">
              <!-- Question header -->
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="mb-0 fw-bold">Question {{ currentQuestionIndex + 1 }}</h5>
                <div class="d-flex gap-2">
                  <button 
                    v-if="questions.length > 1"
                    class="btn btn-outline-danger btn-sm"
                    @click="deleteQuestion(currentQuestionIndex)"
                    type="button"
                  >
                    🗑
                  </button>
                </div>
              </div>

              <!-- Question type -->
              <div class="mb-3">
                <label class="form-label small fw-semibold text-muted">
                  Question Type
                </label>
                <select
                  v-model="currentQuestion.questionType"
                  class="form-select form-select-sm rounded-3 soft-input"
                  @change="onQuestionTypeChange"
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True / False</option>
                  <option value="short_answer">Short Answer</option>
                </select>
              </div>

              <!-- Question editor -->
              <div class="mb-2">
                <label class="form-label small fw-semibold text-muted">
                  Question
                </label>
              </div>

              <!-- Fake toolbar -->
              <div class="toolbar mb-2">
                <button type="button" class="btn-toolbar">⟲</button>
                <button type="button" class="btn-toolbar">⟳</button>
                <span class="toolbar-divider"></span>
                <button type="button" class="btn-toolbar fw-bold">B</button>
                <button type="button" class="btn-toolbar fst-italic">I</button>
                <button type="button" class="btn-toolbar"><u>U</u></button>
                <button type="button" class="btn-toolbar"><s>S</s></button>
                <span class="toolbar-divider"></span>
                <button type="button" class="btn-toolbar">• List</button>
                <button type="button" class="btn-toolbar">1. List</button>
              </div>

              <div class="row g-2 align-items-start mb-4">
                <div class="col-12 ">
                  <textarea
                    v-model="currentQuestion.questionText"
                    rows="3"
                    class="form-control rounded-4 soft-input"
                    placeholder="Enter your question"
                  ></textarea>
                </div>
                <!-- <div class="col-12 col-md-3 d-flex justify-content-md-end mt-2 mt-md-0">
                  <button
                    type="button"
                    class="image-box w-100 w-md-auto"
                  >
                    <span class="image-icon">🖼</span>
                    <span class="small d-block mt-1">Image</span>
                  </button>
                </div> -->
              </div>

              <!-- Options for Multiple Choice -->
              <div v-if="currentQuestion.questionType === 'multiple_choice'" class="mb-4">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <label class="form-label small fw-semibold text-muted mb-0">
                    Options
                  </label>
                  <button
                    class="btn btn-sm btn-outline-primary"
                    @click="addOption"
                    type="button"
                  >
                    + Add Option
                  </button>
                </div>

                <div class="option-row mb-2" v-for="(opt, index) in currentQuestion.options" :key="opt.id">
                  <div class="d-flex align-items-center w-100 gap-2">
                    <div>
                      <input
                        class="form-check-input"
                        type="radio"
                        :name="`correctOption-${currentQuestion.id}`"
                        :value="opt.id"
                        :checked="currentQuestion.correctOptionId === opt.id"
                        @change="setCorrect(opt.id)"
                      />
                    </div>
                    <div class="option-label">
                      {{ String.fromCharCode(65 + index) }}.
                    </div>
                    <div class="flex-grow-1">
                      <input
                        type="text"
                        v-model="opt.text"
                        class="form-control form-control-sm rounded-3 soft-input"
                        :placeholder="`Enter option ${String.fromCharCode(65 + index)}`"
                      />
                    </div>
                    <button 
                      class="btn btn-link text-muted"
                      @click="deleteOption(opt.id)"
                      :disabled="currentQuestion.options.length <= 2"
                      type="button"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>

              <!-- Answer field for Short Answer -->
              <div v-if="currentQuestion.questionType === 'short_answer'" class="mb-4">
                <label class="form-label small fw-semibold text-muted mb-2">
                  Correct Answer
                </label>
                <input
                  type="text"
                  v-model="currentQuestion.answer"
                  class="form-control rounded-3 soft-input"
                  placeholder="Enter the correct answer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-page {
  background: #f5f7ff;
  min-height: calc(100vh - 56px);
  padding-bottom: 1.5rem;
}
.text-primary-quiz {
  color: #16305c;
}
.options-card,
.question-card {
  border-radius: 18px;
}
.soft-input {
  background-color: #eef2ff;
  border: 1px solid #e6e9f5;
}

/* Toolbar */
.toolbar {
  display: inline-flex;
  align-items: center;
  background: #f7f8ff;
  border-radius: 999px;
  padding: 4px 8px;
  margin-bottom: 6px;
}
.btn-toolbar {
  border: none;
  background: transparent;
  padding: 4px 8px;
  font-size: 0.85rem;
}
.btn-toolbar:hover {
  background: rgba(255,255,255,0.7);
  border-radius: 999px;
}
.toolbar-divider {
  width: 1px;
  height: 18px;
  background: #d5d8f0;
  margin: 0 4px;
}

/* Image box */
.image-box {
  border: 2px dashed #d4d7ea;
  border-radius: 16px;
  padding: 14px 18px;
  background: #f9f9ff;
  text-align: center;
}
.image-icon {
  font-size: 1.3rem;
}

/* Options */
.option-row {
  display: flex;
  align-items: center;
}
.option-label {
  font-weight: 600;
  color: #16305c;
  min-width: 24px;
}
.option-row .btn-link {
  text-decoration: none;
  font-size: 1.1rem;
  transition: opacity 0.2s;
  flex-shrink: 0;
}
.option-row .btn-link:hover:not(:disabled) {
  opacity: 0.7;
}
.option-row .btn-link:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Question tabs */
.question-card {
  margin-bottom: 1rem;
}
</style>
