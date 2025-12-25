<template>
  <div class="modal fade" id="answerModal" tabindex="-1" aria-labelledby="answerModalLabel" aria-hidden="true" ref="modalRef">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Answers</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"/>
        </div>

        <div class="modal-body">
          <div class="mb-4">
            <strong>Score:</strong> <span class="fs-5">{{ score }}/{{ maxScore }}</span>
          </div>

          <div v-if="questions.length === 0" class="text-center text-muted py-4">
            No questions to display
          </div>

          <div v-for="(q, index) in questions" :key="q.id || index" :class="['p-3 mb-4 rounded', q.isCorrect ? 'bg-light-success' : 'bg-light-danger']">
            <h6 class="mb-3">
              <span v-if="q.isCorrect" class="text-success">✔ Correct</span>
              <span v-else class="text-danger">✘ Incorrect</span>
            </h6>
            <p class="mb-3"><strong>{{ index + 1 }}. {{ q.question || 'Question ' + (index + 1) }}</strong></p>

            <!-- Multiple Choice Questions -->
            <div v-if="q.choices && q.choices.length > 0">
              <div v-for="(choice, i) in q.choices" :key="i"
                class="choice rounded px-3 py-2 mb-2"
                :class="getChoiceClass(q, i)">
                <strong>{{ choiceLabel(i) }}.</strong> {{ choice }}
              </div>
            </div>

            <!-- Short Answer Questions -->
            <div v-else-if="q.isShortAnswer" class="short-answer-section">
              <!-- User's answer -->
              <div class="mb-2">
                <label class="small text-muted mb-1 d-block">Your answer:</label>
                <div class="answer-field rounded p-3"
                     :class="q.isCorrect ? 'bg-success text-white border border-success' : 'bg-danger text-white border border-danger'">
                  {{ q.userAnswer || '(No answer provided)' }}
                </div>
              </div>
              
              <!-- Correct answer (only show if wrong) -->
              <div v-if="!q.isCorrect" class="mb-2">
                <label class="small text-muted mb-1 d-block">Correct answer:</label>
                <div class="answer-field rounded p-3 bg-success-subtle border border-success">
                  {{ q.correctAnswer || '' }}
                </div>
              </div>
            </div>

            <div v-else class="text-muted">
              No answer data available
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { Modal } from 'bootstrap'

const props = defineProps({
  show: Boolean,
  questions: Array,
  score: Number,
  maxScore: Number
})

const emit = defineEmits(['update:show'])

const modalRef = ref(null)
let modalInstance = null

watch(() => props.show, (val) => {
  if (!modalRef.value) return
  modalInstance ??= new Modal(modalRef.value)

  if (val) modalInstance.show()
  else modalInstance.hide()
})

function handleHidden() {
  emit('update:show', false)
}

onMounted(() => {
  if (modalRef.value) {
    modalRef.value.addEventListener('hidden.bs.modal', handleHidden)
  }
})

onUnmounted(() => {
  if (modalRef.value) {
    modalRef.value.removeEventListener('hidden.bs.modal', handleHidden)
  }
})

function choiceLabel(index) {
  return String.fromCharCode(65 + index) // A, B, C, D
}

function getChoiceClass(q, idx) {
  const isCorrect = idx === q.correctIndex
  const isSelected = idx === q.selectedIndex

  // Nếu đây là đáp án đúng và đã được chọn -> màu xanh đậm
  if (isCorrect && isSelected) {
    return 'bg-success text-white border border-success'
  }
  
  // Nếu đây là đáp án đúng (nhưng không được chọn) -> màu xanh nhạt
  if (isCorrect) {
    return 'bg-success-subtle border border-success'
  }
  
  // Nếu đây là đáp án sai nhưng đã được chọn -> màu đỏ
  if (isSelected && !isCorrect) {
    return 'bg-danger text-white border border-danger'
  }
  
  // Các đáp án khác -> border xám
  return 'bg-light border border-secondary-subtle'
}
</script>

<style scoped>
.bg-light-success {
  background-color: #d4edda;
}
.bg-light-danger {
  background-color: #f8d7da;
}
.choice {
  cursor: default;
}

.answer-field {
  word-wrap: break-word;
  white-space: pre-wrap;
}

.short-answer-section {
  margin-top: 0.5rem;
}
</style>
