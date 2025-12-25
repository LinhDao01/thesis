<script setup>
    import { ref, onMounted, onUnmounted } from 'vue'
    import { useRouter } from 'vue-router'
    import tagQuiz from '@/components/tagQuiz.vue'
    import emptyQuiz from '@/components/emptyQuiz.vue'
    import { api } from '@/services/api'
    import { Modal } from 'bootstrap'

    const router = useRouter()
    const quizzes = ref([])
    const loading = ref(true)
    const error = ref('')
    const openMenuId = ref(null) // Track which menu is open
    const quizToDelete = ref(null)
    let confirmModalInstance = null

    const tags = [
      { name: 'Red',    color: '#F65363' },
      { name: 'Blue',   color: '#1976d2' },
      { name: 'Yellow', color: '#FFEA29' },
      { name: 'Green',  color: '#16c172' },
    ]
    

    function formatDate(dateString) {
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now - date)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) return '1 day ago'
      if (diffDays < 7) return `${diffDays} days ago`
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
      return `${Math.floor(diffDays / 365)} years ago`
    }

    function startQuiz(quizId) {
      router.push(`/quiz/${quizId}`)
    }

    function viewDetail(quizId) {
      router.push(`/quiz/${quizId}/detail`)
    }

    function toggleMenu(quizId) {
      // Toggle menu - nếu đang mở thì đóng, nếu đang đóng thì mở
      openMenuId.value = openMenuId.value === quizId ? null : quizId
    }

    function closeMenu() {
      openMenuId.value = null
    }

    function editQuiz(quizId) {
      closeMenu()
      // TODO: Implement edit functionality
      console.log('Edit quiz:', quizId)
    }

    function askDelete(quizId) {
      quizToDelete.value = quizId
      confirmModalInstance = new Modal(document.getElementById('confirmDeleteModal'))
      confirmModalInstance.show()
    }


    async function loadQuizzes() {
      try {
        loading.value = true
        error.value = ''
        
        // Get user from localStorage
        const userStr = localStorage.getItem('auth_user')
        if (!userStr) {
          error.value = 'Please login to view your quizzes'
          loading.value = false
          return
        }

        const user = JSON.parse(userStr)
        const response = await api.getUserQuizzes(user.id)
        
        quizzes.value = response.data?.quizzes || []
      } catch (err) {
        console.error('Error loading quizzes:', err)
        error.value = err.message || 'Failed to load quizzes'
      } finally {
        loading.value = false
      }
    }

    async function confirmDelete() {
      if (!quizToDelete.value) return

      try {
        const userStr = localStorage.getItem('auth_user')
        if (!userStr) {
          error.value = 'Please login to delete quiz'
          return
        }

        const user = JSON.parse(userStr)
        await api.deleteQuiz(quizToDelete.value, user.id)

        await loadQuizzes()
        quizToDelete.value = null
        confirmModalInstance.hide()
      } catch (err) {
        console.error('Error deleting quiz:', err)
        error.value = err.message || 'Failed to delete quiz'
      }
    }

    // async function deleteQuiz(quizId) {
    //   closeMenu()
      
    //   try {
    //     // Get user from localStorage
    //     const userStr = localStorage.getItem('auth_user')

    //     const user = JSON.parse(userStr)
        
    //     // Call API to delete quiz (soft delete - set status to 0)
    //     await api.deleteQuiz(quizId, user.id)
        
    //     // Reload quizzes to reflect the change
    //     await loadQuizzes()
    //   } catch (err) {
    //     console.error('Error deleting quiz:', err)
    //     error.value = err.message || 'Failed to delete quiz'
    //   }
    // }

    onMounted(() => {
      loadQuizzes()
      // Đóng menu khi click ra ngoài
      document.addEventListener('click', closeMenu)
    })

    onUnmounted(() => {
      // Cleanup event listener
      document.removeEventListener('click', closeMenu)
    })
</script>

<template>
  <div class="container py-4 py-md-5 page-light">
    <!-- Header: Tags -->
    <div class="d-flex align-items-center justify-content-between mb-3">
      <!-- <h2 class="section-title">Tags <span class="plus-pill">+</span></h2> -->

      <!--  -->
    </div>

    <!-- Tags row -->
    <!-- <div class="row g-3 mb-4">
      <div v-for="t in tags" :key="t.name" class="col-12 col-md-6 col-lg-3">
        <tagQuiz :name="t.name" :color="t.color" />
      </div>
    </div> -->

    <!-- Header: Flashcards -->
    <div class="d-flex align-items-center justify-content-between mb-4">
      <h2 class="section-title mt-2">Quizzes</h2>
    </div>

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

    <!-- Quiz list -->
    <div v-else-if="quizzes.length > 0" class="row g-4">
      <div
        v-for="quiz in quizzes"
        :key="quiz.id"
        class="col-12 col-md-6 col-lg-4 d-flex"
      >
        <div class="quiz-card w-100 d-flex flex-column">
          <!-- Header -->
          <div class="quiz-card-header">
            <h3 class="quiz-title" :title="quiz.title">{{ quiz.title }}</h3>
            <div class="quiz-menu-container">
              <button
                class="quiz-menu-btn"
                type="button"
                @click.stop="toggleMenu(quiz.id)"
                :aria-expanded="openMenuId === quiz.id"
              >
                ⋮
              </button>
              <div
                v-if="openMenuId === quiz.id"
                class="quiz-menu-dropdown"
                @click.stop
              >
                <a class="quiz-menu-item quiz-menu-item-danger" href="#" @click.prevent="askDelete(quiz.id)">
                  Delete
                </a>
              </div>
            </div>
          </div>

          <!-- Metadata -->
          <div class="quiz-meta mt-auto">
            <span>{{ quiz._count?.questions || 0 }} questions</span>
            <span class="dot">•</span>
            <span>{{ formatDate(quiz.createdAt) }}</span>
          </div>

          <!-- Actions -->
          <div class="quiz-actions">
            <button class="btn btn-outline-primary btn-edit" @click="viewDetail(quiz.id)">
              Detail
            </button>
            <button class="btn btn-primary btn-start" @click="startQuiz(quiz.id)">
              Start
            </button>
          </div>
        </div>
      </div>
</div>

    <!-- Empty state -->
    <emptyQuiz v-else />

  </div>
  <!-- Confirm Delete Modal -->
  <div class="modal fade" id="confirmDeleteModal" tabindex="-1" aria-labelledby="confirmDeleteLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="confirmDeleteLabel">Confirm Delete</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" />
        </div>
        <div class="modal-body">
          Are you sure you want to delete this quiz?
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-danger" @click.prevent="confirmDelete">Delete</button>
        </div>
      </div>
    </div>
  </div>

</template>

<style scoped>
    .page-light { background: #f5f7ff; border-radius: 16px; }
    .section-title {
    font-weight: 800;
    color: #16305c;
    display: inline-flex;
    align-items: center;
    gap: .5rem;
    }
    .plus-pill {
    display: inline-flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 999px;
    background: #ff7a59; color: #fff; font-weight: 700; font-size: 18px;
    cursor: pointer;
    }
    .plus-pill:hover {
    background: #ff6347;
    }

    .quiz-card {
    background: #fff;
    border-radius: 18px;
    padding: 28px;
    box-shadow: 0 6px 18px rgba(22, 48, 92, 0.08);
    transition: transform 0.08s ease, box-shadow 0.2s ease;
    }

    .quiz-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 24px rgba(22, 48, 92, 0.12);
    }

    .quiz-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 12px;
    position: relative;
    }

    .quiz-title {
    font-size: 20px;
    font-weight: 700;
    color: #16305c;
    margin: 0;
    flex: 1;

    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    }

    .quiz-menu-container {
    position: relative;
    }

    .quiz-menu-btn {
    background: none;
    border: none;
    font-size: 20px;
    color: #16305c;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    }

    .quiz-menu-btn:hover {
    background: #f5f7ff;
    }

    .quiz-menu-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 4px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 120px;
    z-index: 1000;
    overflow: hidden;
    }

    .quiz-menu-item {
    display: block;
    padding: 10px 16px;
    color: #16305c;
    text-decoration: none;
    font-size: 14px;
    transition: background 0.2s;
    border: none;
    width: 100%;
    text-align: left;
    background: none;
    cursor: pointer;
    }

    .quiz-menu-item:hover {
    background: #f5f7ff;
    color: #16305c;
    }

    .quiz-menu-item-danger {
    color: #dc3545;
    }

    .quiz-menu-item-danger:hover {
    background: #fee;
    color: #dc3545;
    }

    .quiz-meta {
    color: #6c757d;
    font-size: 14px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
    }

    .quiz-meta .dot {
    font-size: 8px;
    }

    .quiz-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    }

    .btn-edit,
    .btn-start {
    padding: 10px 24px;
    border-radius: 8px;
    font-weight: 600;
    transition: all 0.2s;
    }

    .btn-edit {
    border: 2px solid #1976d2;
    color: #1976d2;
    background: transparent;
    }

    .btn-edit:hover {
    background: #1976d2;
    color: #fff;
    }

    .btn-start {
    background: #1976d2;
    color: #fff;
    border: 2px solid #1976d2;
    }

    .btn-start:hover {
    background: #1565c0;
    border-color: #1565c0;
    }

    .quiz-title {
      font-size: 20px;
      font-weight: 700;
      color: #16305c;
      margin: 0;
      flex: 1;

      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }

</style>
