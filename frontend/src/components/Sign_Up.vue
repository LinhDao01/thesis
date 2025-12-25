<script setup>
  import { ref, nextTick } from 'vue'
  import { useRouter } from 'vue-router'
  import * as bootstrap from 'bootstrap'
  import { auth } from '@/services/auth.service'

  const email = ref('')
  const name = ref('')
  const password = ref('')
  const confirmPassword = ref('')
  const errorMsg = ref('')
  const isLoading = ref(false)

  const router = useRouter()

  function closeModal() {
    const modalElement = document.getElementById('signin')
    if (modalElement) {
      const m = bootstrap.Modal.getInstance(modalElement)
      if (m) {
        m.hide()
      }
    }
  }

  async function openLogin() {
    closeModal()
    await nextTick()
    const modalElement = document.getElementById('loginModal')
    if (modalElement) {
      const modal = bootstrap.Modal.getOrCreateInstance(modalElement)
      modal.show()
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    errorMsg.value = ''
    
    // Validation
    if (!email.value.trim() || !name.value.trim() || !password.value || !confirmPassword.value) {
      errorMsg.value = 'Vui lòng điền đầy đủ thông tin'
      return
    }

    if (password.value !== confirmPassword.value) {
      errorMsg.value = 'Mật khẩu xác nhận không khớp'
      return
    }

    if (password.value.length < 6) {
      errorMsg.value = 'Mật khẩu phải có ít nhất 6 ký tự'
      return
    }

    isLoading.value = true
    try {
      await auth.register(email.value.trim(), password.value, name.value.trim())
      closeModal()
      
      // Redirect đến trang dashboard
      router.push('/quizdash').then(() => {
        window.location.reload()
      })
    } catch (err) {
      errorMsg.value = err.message || 'Đăng ký thất bại'
    } finally {
      isLoading.value = false
    }
  }
</script>

<template>
  <!-- Bootstrap Modal -->
  <div class="modal fade" id="signin" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content login-card border-0 shadow-lg">
        <div class="modal-body p-4 p-md-5">
          <!-- Close -->
          <button type="button" class="btn-close ms-auto d-block" data-bs-dismiss="modal" aria-label="Close"></button>

          <h3 class="fw-bold mb-4">Sign up</h3>

          <!-- Google button -->
          <button type="button" class="btn btn-light w-100 py-3 rounded-4 d-flex align-items-center justify-content-center gap-2 mb-3 border google-btn">
            <img width="20" height="20" alt="g" src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" style="width:20px;height:20px;object-fit:contain"/>
            <span class="fw-semibold">Login with Google</span>
          </button>

          <hr class="my-3">

          <form @submit="onSubmit">
            <!-- Email -->
            <div class="mb-3">
              <label class="form-label fw-semibold">Email Address</label>
              <input 
                v-model="email" 
                type="email" 
                class="form-control form-control-lg rounded-4 soft-input" 
                placeholder="you@example.com"
                required>
            </div>

            <!-- Name -->
            <div class="mb-3">
              <label class="form-label fw-semibold">Full Name</label>
              <input 
                v-model="name" 
                type="text" 
                class="form-control form-control-lg rounded-4 soft-input" 
                placeholder="Your full name"
                required>
            </div>

            <!-- Password -->
            <div class="mb-3">
              <label class="form-label fw-semibold">Password</label>
              <input 
                v-model="password" 
                type="password" 
                class="form-control form-control-lg rounded-4 soft-input" 
                placeholder="••••••••"
                minlength="6"
                required>
            </div>

            <!-- Confirm Password -->
            <div class="mb-4">
              <label class="form-label fw-semibold">Confirm password</label>
              <input 
                v-model="confirmPassword" 
                type="password" 
                class="form-control form-control-lg rounded-4 soft-input" 
                placeholder="••••••••"
                required>
            </div>

            <div v-if="errorMsg" class="text-danger text-center mb-3">{{ errorMsg }}</div>

            <!-- Sign Up button (center) -->
            <div class="text-center">
              <button 
                type="submit"
                class="btn btn-outline-primary rounded-pill px-5 py-2 fw-semibold login-btn"
                :disabled="isLoading">
                <span v-if="isLoading">Đang xử lý...</span>
                <span v-else>Sign Up</span>
              </button>
            </div>
          </form>

          <div class="text-center mt-3">
            <a href="#" 
              class="d-block link-primary text-decoration-none" 
              @click.prevent="openLogin">
              Already have an account
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modal look */
.login-card {
  border-radius: 16px;
}

/* light blue input background like mock */
.soft-input {
  background: #eef2ff;          /* xanh rất nhạt */
  border: 1px solid #e6e9f5;
}

/* Google button subtle border */
.google-btn { border-color: #e6e6e6 !important; }

/* Outline button style similar to sample */
.login-btn {
  border-width: 2px;
}

/* Blur + dim backdrop */
:global(.modal-backdrop.show){
  backdrop-filter: blur(6px);
  opacity: .6;
}
</style>
