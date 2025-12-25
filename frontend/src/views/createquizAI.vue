<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../services/api'
import * as bootstrap from 'bootstrap'

type Tab = 'text' | 'document' | 'image' | 'video'

const router = useRouter()
const activeTab = ref<Tab>('document')
const selectedFile = ref<File | null>(null)
const uploadError = ref('')

const fileInput = ref<HTMLInputElement | null>(null)
const supportedTypes = ['application/pdf', 'text/plain']

const canUpload = computed(() => activeTab.value === 'document')

// text mode
const textInput = ref<string>('')

// trạng thái tạo quiz (sau này nối backend)
const isCreating = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const quiz = ref<any>(null)

// Modal và progress state
const showProgressModal = ref(false)
const progress = ref(0)
const progressStatus = ref('Đang xử lý...')
const isCompleted = ref(false)

// Modal chọn số câu hỏi
const showQuestionCountModal = ref(false)
const questionCount = ref(10) // Mặc định 10 câu
const pendingFile = ref<File | null>(null)

function chooseFile() {
  if (!canUpload.value) return
  fileInput.value?.click()
}

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  if (!target.files || !target.files.length) return
  handleFile(target.files[0])
}

function handleFile(file: File) {
  uploadError.value = ''
  if (!supportedTypes.includes(file.type)) {
    uploadError.value = 'Chỉ hỗ trợ file PDF (.pdf) hoặc Text (.txt)'
    selectedFile.value = null
    if (fileInput.value) {
      fileInput.value.value = ''
    }
    return
  }
  
  // Nếu là PDF, hiển thị modal chọn số câu hỏi trước
  if (file.type === 'application/pdf') {
    pendingFile.value = file
    // Chưa set selectedFile, đợi user confirm
    showQuestionCountModal.value = true
    nextTick(() => {
      const modalElement = document.getElementById('questionCountModal')
      if (modalElement) {
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement)
        modal.show()
      }
    })
  } else {
    // Text file thì set luôn
    selectedFile.value = file
  }
}

// Hàm đóng modal chọn số câu hỏi
function closeQuestionCountModal() {
  const modalElement = document.getElementById('questionCountModal')
  if (modalElement) {
    const modal = bootstrap.Modal.getInstance(modalElement)
    if (modal) {
      modal.hide()
    }
  }
  showQuestionCountModal.value = false
  // Reset pending file và file input nếu user hủy (chưa confirm)
  if (pendingFile.value && !selectedFile.value) {
    pendingFile.value = null
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

// Hàm xác nhận số câu hỏi và bắt đầu tạo quiz
function confirmQuestionCount() {
  if (!pendingFile.value) return
  
  // Set selectedFile để UI hiển thị đúng
  selectedFile.value = pendingFile.value
  closeQuestionCountModal()
  
  // Bắt đầu tạo quiz (pendingFile vẫn giữ để dùng trong createFromFile)
  createFromFile()
}

function resetFile() {
  selectedFile.value = null
  uploadError.value = ''
}

// TODO: sau này gọi API backend để tạo quiz từ text
// function createFromText() {
//   if (!textInput.value.trim()) {
//     uploadError.value = 'Please enter your text'
//     return
//   }
//   uploadError.value = ''
//   isCreating.value = true
//   // Gọi API ở đây
//   // ví dụ: api.generateQuizFromText(textInput.value)
//   // tạm thời mô phỏng:
//   setTimeout(() => {
//     isCreating.value = false
//     alert('Create quiz from text (demo)')
//   }, 500)
// }

// Hàm simulate progress
function simulateProgress() {
  progress.value = 0
  progressStatus.value = 'Đang phân tích nội dung...'
  
  const interval = setInterval(() => {
    if (progress.value < 90) {
      progress.value = Math.min(progress.value + Math.random() * 12, 90)
      if (progress.value > 30 && progress.value < 60) {
        progressStatus.value = 'Đang tạo câu hỏi...'
      } else if (progress.value > 60 && progress.value < 85) {
        progressStatus.value = 'Đang tạo đáp án...'
      } else if (progress.value >= 85) {
        progressStatus.value = 'Đang hoàn thiện...'
      }
    } else {
      clearInterval(interval)
    }
  }, 300)
  
  return interval
}

// Hàm mở modal progress
function openProgressModal() {
  showProgressModal.value = true
  progress.value = 0
  isCompleted.value = false
  progressStatus.value = 'Đang xử lý...'
  
  nextTick(() => {
    const modalElement = document.getElementById('quizProgressModal')
    if (modalElement) {
      const modal = bootstrap.Modal.getOrCreateInstance(modalElement)
      modal.show()
    }
  })
}

// Hàm đóng modal
function closeProgressModal() {
  const modalElement = document.getElementById('quizProgressModal')
  if (modalElement) {
    const modal = bootstrap.Modal.getInstance(modalElement)
    if (modal) {
      modal.hide()
    }
  }
  showProgressModal.value = false
  progress.value = 0
  isCompleted.value = false
}

// Hàm lưu quiz vào DB và điều hướng
async function saveQuizAndStart() {
  if (!quiz.value || !quiz.value.questions) {
    errorMsg.value = 'No quiz data found'
    return
  }

  try {
    // Lấy user từ localStorage
    const userStr = localStorage.getItem('auth_user')
    if (!userStr) {
      errorMsg.value = 'Please login to make/take a quiz'
      return
    }
    const user = JSON.parse(userStr)
    
    // Format questions để lưu vào DB
    const questionsToSave = quiz.value.questions.map((q: any) => ({
      question: q.question || q.content,
      answer: q.answer || q.correct || (q.choices && q.choices[q.answer_index]),
      choices: q.choices || q.options || []
    }))

    // Lưu quiz vào DB
    const saveRes = await api.saveQuiz(
      user.id,
      `Quiz from ${activeTab.value === 'text' ? 'text' : selectedFile.value?.name || 'file'}`,
      questionsToSave
    )

    if (saveRes.data && saveRes.data.quiz) {
      const savedQuizId = saveRes.data.quiz.id
      // Điều hướng đến trang làm quiz
      router.push(`/quiz/${savedQuizId}`)
      closeProgressModal()
    } else {
      errorMsg.value = 'Failed to save quiz'
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'An error occurred while saving quiz'
    console.error('Error saving quiz:', err)
  }
}

// Hàm bắt đầu làm quiz (giữ lại để tương thích)
function startQuiz() {
  saveQuizAndStart()
}

async function createFromText() {
  if (!textInput.value.trim()) {
    uploadError.value = 'Please enter your text'
    return
  }
  uploadError.value = ''
  errorMsg.value = ''
  isCreating.value = true
  loading.value = true
  
  // Mở modal progress
  openProgressModal()
  const progressInterval = simulateProgress()
  
  try {
    const res = await api.generateQuizFromText(textInput.value);
    // Handle JSend format response: { status: 'success', data: { quiz: {...} } }
    // or direct format: { quiz: {...} }
    quiz.value = res.data?.quiz || res.quiz || res;
    console.log('Quiz generated:', quiz.value);
    
    if (!quiz.value || !quiz.value.questions || quiz.value.questions.length === 0) {
      throw new Error('Cannot create quiz from text. Please try again with different content.');
    }
    
    // Hoàn thành progress
    clearInterval(progressInterval)
    progress.value = 100
    progressStatus.value = 'Completed!'
    isCompleted.value = true
  } catch (err: any) {
    clearInterval(progressInterval)
    errorMsg.value = err.message || 'An error occurred while creating quiz';
    uploadError.value = errorMsg.value;
    progressStatus.value = 'An error occurred'
    isCompleted.value = false
    // Không tự động đóng modal khi có lỗi, để user có thể đọc lỗi và đóng thủ công
  } finally {
    isCreating.value = false;
    loading.value = false;
  }
}
async function createFromFile() {
  const fileToUse = pendingFile.value || selectedFile.value
  if (!fileToUse) {
    uploadError.value = 'Please select a file before creating a quiz'
    return
  }
  uploadError.value = ''
  errorMsg.value = ''
  isCreating.value = true
  loading.value = true
  
  // Mở modal progress
  openProgressModal()
  const progressInterval = simulateProgress()
  
  try {
    const res = await api.generateQuizFromFile(fileToUse, questionCount.value);
    // Handle JSend format response: { status: 'success', data: { quiz: {...} } }
    // or direct format: { quiz: {...} }
    quiz.value = res.data?.quiz || res.quiz || res;
    console.log('Quiz generated from file:', quiz.value);
    
    if (!quiz.value || !quiz.value.questions || quiz.value.questions.length === 0) {
      throw new Error('Cannot create quiz from file. Please try again with a different file.');
    }
    
    // Hoàn thành progress
    clearInterval(progressInterval)
    progress.value = 100
    progressStatus.value = 'Completed!'
    isCompleted.value = true
  } catch (err: any) {
    clearInterval(progressInterval)
    errorMsg.value = err.message || 'An error occurred while creating quiz';
    uploadError.value = errorMsg.value;
    progressStatus.value = 'An error occurred'
    isCompleted.value = false
    // Không tự động đóng modal khi có lỗi, để user có thể đọc lỗi và đóng thủ công
  } finally {
    isCreating.value = false;
    loading.value = false;
  }
}
</script>

<template>
  <div class="container py-4 py-md-5">
    <h2 class="page-title mb-1">AI Quiz Generator</h2>
    <p class="text-muted mb-4">
      Upload a PDF document to automatically generate a quiz with AI.
    </p>

    <!-- Tabs + Options -->
    <!-- <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
      <div class="quiz-tabs d-inline-flex rounded-pill bg-light">
        <button
          class="quiz-tab"
          :class="{ active: activeTab === 'text' }"
          type="button"
          @click="activeTab = 'text'"
        >
          Text
        </button>
        <button
          class="quiz-tab"
          :class="{ active: activeTab === 'document' }"
          type="button"
          @click="activeTab = 'document'"
        >
          Document
        </button>
      </div>
    </div> -->

    <!-- Upload / Input area -->
    <div
      class="upload-area d-flex flex-column justify-content-center align-items-center text-center"
      :class="{ 'upload-disabled': !canUpload && activeTab !== 'text' }"
      @click="activeTab === 'document' && chooseFile()"
    >
      <!-- input hidden -->
      <input
        ref="fileInput"
        type="file"
        class="d-none"
        accept=".pdf,.txt,application/pdf,text/plain"
        @change="onFileChange"
      />

      <!-- Document tab -->
      <template v-if="activeTab === 'document'">
        <template v-if="!selectedFile">
          <p class="text-muted mb-2">
            Click here or drop a PDF/TXT file to upload.
          </p>
          <p class="small text-secondary mb-3">
            Accepted formats: <strong>.pdf</strong>, <strong>.txt</strong>
          </p>
          <button
            type="button"
            class="btn btn-primary rounded-pill px-4"
            @click.stop="chooseFile"
          >
            Choose file
          </button>
        </template>

        <template v-else>
          <p class="mb-1 fw-semibold">
            Selected file:
          </p>
          <p class="mb-1">
            {{ selectedFile.name }} ({{ (selectedFile.size / 1024).toFixed(1) }} KB)
          </p>
          <div class="d-flex gap-2 justify-content-center mt-2">
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary rounded-pill"
              @click.stop="resetFile"
            >
              Remove file
            </button>
            <button
              type="button"
              class="btn btn-sm btn-primary rounded-pill"
              @click.stop="createFromFile"
              :disabled="isCreating"
            >
              {{ isCreating ? 'Creating...' : 'Create quiz' }}
            </button>
          </div>
        </template>
      </template>

      <!-- Text tab -->
      <template v-else-if="activeTab === 'text'">
        <div class="w-100" @click.stop>
          <textarea
            v-model="textInput"
            rows="6"
            class="form-control rounded-4 soft-input mb-3"
            placeholder="Paste your notes or reading passage here..."
          ></textarea>
          <button
            type="button"
            class="btn btn-primary rounded-pill px-4"
            @click="createFromText"
            :disabled="isCreating"
          >
            {{ isCreating ? 'Creating...' : 'Create quiz from text' }}
          </button>
        </div>
      </template>
    </div>

    <p v-if="uploadError" class="text-danger mt-2">{{ uploadError }}</p>

    <!-- Bottom hint -->
    <p class="mt-3 small text-muted">
      Don't have any content to use?
      <router-link 
        to="/create/manual" 
        class="text-decoration-none">
        Try creating a quiz from scratch
      </router-link>
    </p>
  </div>

  <!-- Progress Modal -->
  <div 
    class="modal fade" 
    id="quizProgressModal" 
    tabindex="-1" 
    aria-labelledby="quizProgressModalLabel" 
    aria-hidden="true"
    data-bs-backdrop="static"
    data-bs-keyboard="false"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0 shadow-lg" style="border-radius: 18px;">
        <div class="modal-body p-4 p-md-5 text-center">
          <!-- Loading Spinner -->
          <div v-if="!isCompleted && !errorMsg" class="mb-4">
            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
          
          <!-- Success Icon -->
          <div v-else-if="isCompleted" class="mb-4">
            <div class="success-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#28a745" opacity="0.2"/>
                <path d="M9 12l2 2 4-4" stroke="#28a745" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>

          <!-- Error Icon -->
          <div v-else-if="errorMsg" class="mb-4">
            <div class="error-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#dc3545" opacity="0.2"/>
                <path d="M12 8v4M12 16h.01" stroke="#dc3545" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
          </div>

          <!-- Title -->
          <h4 class="fw-bold mb-3" style="color: #16305c;">
            <span v-if="isCompleted">Quiz has been created successfully!</span>
            <span v-else-if="errorMsg">An error occurred</span>
            <span v-else>Creating quiz...</span>
          </h4>

          <!-- Progress Status / Error Message -->
          <p class="mb-4" :class="errorMsg ? 'text-danger' : 'text-muted'">
            {{ errorMsg || progressStatus }}
          </p>

          <!-- Progress Bar (chỉ hiện khi không có lỗi) -->
          <div v-if="!errorMsg" class="mb-4">
            <div class="progress" style="height: 8px; border-radius: 10px; background-color: #eef2ff;">
              <div 
                class="progress-bar progress-bar-striped" 
                :class="{ 
                  'progress-bar-animated': !isCompleted && !errorMsg,
                  'bg-danger': errorMsg
                }"
                role="progressbar" 
                :style="{ 
                  width: progress + '%',
                  background: errorMsg ? '' : 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)'
                }"
                :aria-valuenow="progress" 
                aria-valuemin="0" 
                aria-valuemax="100"
              ></div>
            </div>
            <small class="text-muted mt-2 d-block">{{ Math.round(progress) }}%</small>
          </div>

          <!-- Start Button (chỉ hiện khi hoàn thành) -->
          <div v-if="isCompleted" class="mt-3">
            <button 
              type="button" 
              class="btn btn-primary rounded-pill px-5 py-2"
              @click="startQuiz"
            >
              Start Quiz
            </button>
          </div>

          <!-- Close Button (hiện khi có lỗi hoặc hoàn thành) -->
          <div v-if="errorMsg || isCompleted" class="mt-3">
            <button 
              type="button" 
              class="btn btn-outline-secondary rounded-pill px-4 py-2"
              @click="closeProgressModal"
            >
              {{ errorMsg ? 'Close' : 'Close' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal chọn số câu hỏi -->
  <div 
    class="modal fade" 
    id="questionCountModal" 
    tabindex="-1" 
    aria-labelledby="questionCountModalLabel" 
    aria-hidden="true"
    data-bs-backdrop="static"
    data-bs-keyboard="false"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content border-0 shadow-lg" style="border-radius: 18px;">
        <div class="modal-header border-0 pb-0">
          <h5 class="modal-title fw-bold" id="questionCountModalLabel" style="color: #16305c;">
            Chọn số câu hỏi
          </h5>
          <button 
            type="button" 
            class="btn-close" 
            aria-label="Close"
            @click="closeQuestionCountModal"
          ></button>
        </div>
        <div class="modal-body pt-3">
          <p class="text-muted mb-3">
            Bạn muốn tạo bao nhiêu câu hỏi từ file PDF này?
          </p>
          <div class="mb-3">
            <label for="questionCountInput" class="form-label fw-semibold">
              Số câu hỏi (5-50)
            </label>
            <input
              type="number"
              class="form-control"
              id="questionCountInput"
              v-model.number="questionCount"
              min="5"
              max="50"
              step="1"
            />
            <div class="form-text">
              Gợi ý: Chọn 10-20 câu hỏi để có kết quả tốt nhất
            </div>
          </div>
        </div>
        <div class="modal-footer border-0 pt-0">
          <button 
            type="button" 
            class="btn btn-outline-secondary rounded-pill px-4"
            @click="closeQuestionCountModal"
          >
            Hủy
          </button>
          <button 
            type="button" 
            class="btn btn-primary rounded-pill px-4"
            @click="confirmQuestionCount"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-title {
  font-weight: 800;
  color: #16305c;
}

/* Tabs */
.quiz-tabs {
  background: #f2f4ff;
  padding: 4px;
}
.quiz-tab {
  border: none;
  background: transparent;
  padding: 10px 24px;
  border-radius: 999px;
  font-weight: 600;
  color: #43527a;
  font-size: 0.95rem;
}
.quiz-tab.active {
  background: #eef2ff;
  color: #16305c;
  box-shadow: 0 0 0 1px rgba(22, 48, 92, 0.05);
}

/* Options */
.quiz-options {
  border-color: #ddd;
  color: #16305c;
  background: #fff;
}

/* Upload area */
.upload-area {
  min-height: 260px;
  border-radius: 18px;
  border: 2px dashed #d0d0d0;
  background: #f8f8f8;
  padding: 24px;
}
.upload-area.upload-disabled {
  cursor: default;
  opacity: 0.85;
}
.soft-input {
  background: #eef2ff;
  border: 1px solid #e6e9f5;
}

/* Progress Modal Styles */
.success-icon,
.error-icon {
  animation: scaleIn 0.3s ease-out;
}

@keyframes scaleIn {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.progress-bar {
  transition: width 0.3s ease;
}
</style>
