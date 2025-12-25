<script setup>
  import { ref, computed, onMounted, nextTick } from 'vue'
  import { useRouter } from 'vue-router'
  import { auth } from '@/services/auth.mock'
  import * as bootstrap from 'bootstrap'

  const router = useRouter()
  const user = computed(() => auth.currentUser())
  
  const oldPassword = ref('')
  const newPassword = ref('')
  const confirmPassword = ref('')
  const errorMsg = ref('')
  const successMsg = ref('')

  function openChangePassword() {
    const modalElement = document.getElementById('changePasswordModal')
    if (modalElement) {
      const modal = bootstrap.Modal.getOrCreateInstance(modalElement)
      modal.show()
    }
  }

  function closeChangePasswordModal() {
    const modalElement = document.getElementById('changePasswordModal')
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement)
      if (modal) {
        modal.hide()
      }
    }
    // Reset form
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    errorMsg.value = ''
    successMsg.value = ''
  }

  async function onChangePassword(e) {
    e.preventDefault()
    errorMsg.value = ''
    successMsg.value = ''

    // Validation
    if (!oldPassword.value || !newPassword.value || !confirmPassword.value) {
      errorMsg.value = 'Vui lòng điền đầy đủ thông tin'
      return
    }

    if (newPassword.value !== confirmPassword.value) {
      errorMsg.value = 'Mật khẩu mới và xác nhận mật khẩu không khớp'
      return
    }

    if (newPassword.value.length < 6) {
      errorMsg.value = 'Mật khẩu mới phải có ít nhất 6 ký tự'
      return
    }

    // Kiểm tra mật khẩu cũ (trong thực tế sẽ gọi API)
    if (oldPassword.value !== user.value?.password) {
      errorMsg.value = 'Mật khẩu cũ không đúng'
      return
    }

    // Thành công (trong thực tế sẽ gọi API để đổi mật khẩu)
    successMsg.value = 'Đổi mật khẩu thành công!'
    setTimeout(() => {
      closeChangePasswordModal()
    }, 1500)
  }

  // Lấy avatar từ tên (initials)
  const avatarInitials = computed(() => {
    if (user.value?.name) {
      const names = user.value.name.split(' ')
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase()
      }
      return user.value.name.substring(0, 2).toUpperCase()
    }
    return 'U'
  })
</script>

<template>
  <div class="container py-5">
    <div class="row justify-content-center">
      <div class="col-12 col-md-8 col-lg-6">
        <div class="card shadow-sm border-0">
          <div class="card-body p-4 p-md-5">
            <h2 class="fw-bold mb-4">Profile</h2>

            <!-- Avatar -->
            <div class="text-center mb-4">
              <div class="avatar-circle mx-auto mb-3">
                {{ avatarInitials }}
              </div>
              <h4 class="fw-bold mb-1">{{ user?.name || 'User' }}</h4>
              <p class="text-muted mb-0">{{ user?.email || '' }}</p>
            </div>

            <hr class="my-4">

            <!-- User Info -->
            <div class="mb-4">
              <div class="mb-3">
                <label class="form-label fw-semibold text-muted small">Họ và tên</label>
                <div class="form-control-plaintext fw-semibold">{{ user?.name || 'N/A' }}</div>
              </div>

              <div class="mb-3">
                <label class="form-label fw-semibold text-muted small">Email</label>
                <div class="form-control-plaintext">{{ user?.email || 'N/A' }}</div>
              </div>
            </div>

            <!-- Change Password Button -->
            <div class="text-center">
              <button class="btn btn-outline-primary rounded-pill px-4" @click="openChangePassword">
                Đổi mật khẩu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Change Password Modal -->
  <div class="modal fade" id="changePasswordModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content login-card border-0 shadow-lg">
        <div class="modal-body p-4 p-md-5">
          <button type="button" class="btn-close ms-auto d-block" @click="closeChangePasswordModal" aria-label="Close"></button>
          <h3 class="fw-bold mb-4">Đổi mật khẩu</h3>

          <form @submit="onChangePassword">
            <div class="mb-3">
              <label class="form-label fw-semibold">Mật khẩu cũ</label>
              <input 
                v-model="oldPassword" 
                type="password" 
                class="form-control form-control-lg rounded-4 soft-input" 
                placeholder="Nhập mật khẩu cũ" 
                required>
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold">Mật khẩu mới</label>
              <input 
                v-model="newPassword" 
                type="password" 
                class="form-control form-control-lg rounded-4 soft-input" 
                placeholder="Nhập mật khẩu mới" 
                required>
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold">Xác nhận mật khẩu mới</label>
              <input 
                v-model="confirmPassword" 
                type="password" 
                class="form-control form-control-lg rounded-4 soft-input" 
                placeholder="Nhập lại mật khẩu mới" 
                required>
            </div>

            <div v-if="errorMsg" class="text-danger text-center mb-3">{{ errorMsg }}</div>
            <div v-if="successMsg" class="text-success text-center mb-3">{{ successMsg }}</div>

            <div class="text-center">
              <button class="btn btn-outline-primary rounded-pill px-5 py-2 fw-semibold login-btn" type="submit">
                Đổi mật khẩu
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .avatar-circle {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    font-weight: bold;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }

  .login-card { 
    border-radius: 16px; 
  }

  .soft-input { 
    background: #eef2ff; 
    border: 1px solid #e6e9f5; 
  }

  .login-btn { 
    border-width: 2px; 
  }

  :global(.modal-backdrop.show) { 
    backdrop-filter: blur(6px); 
    opacity: .6; 
  }

  .form-control-plaintext {
    padding: 0.5rem 0;
    border-bottom: 1px solid #e9ecef;
  }
</style>

