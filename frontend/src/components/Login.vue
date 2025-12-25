<!-- <template> -->
  <!-- Bootstrap Modal -->
  <!-- <div class="modal fade" id="loginModal" tabindex="-1" aria-hidden="true"> -->
    <!-- <div class="modal-dialog modal-dialog-centered modal-lg"> -->
      <!-- <div class="modal-content login-card border-0 shadow-lg">
        <div class="modal-body p-4 p-md-5"> -->
          <!-- Close -->
          <!-- <button type="button" class="btn-close ms-auto d-block" data-bs-dismiss="modal" aria-label="Close"></button>

          <h3 class="fw-bold mb-4">Login</h3> -->

          <!-- Google button -->
          <!-- <button type="button" class="btn btn-light w-100 py-3 rounded-4 d-flex align-items-center justify-content-center gap-2 mb-3 border google-btn">
            <img width="20" height="20" alt="g" src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" style="width:20px;height:20px;object-fit:contain"/>
            <span class="fw-semibold">Login with Google</span>
          </button>

          <hr class="my-3"> -->

          <!-- Email -->
          <!-- <div class="mb-3">
            <label class="form-label fw-semibold">Email Address</label>
            <input type="email" class="form-control form-control-lg rounded-4 soft-input" placeholder="you@example.com">
          </div> -->

          <!-- Password -->
          <!-- <div class="mb-4">
            <label class="form-label fw-semibold">Password</label>
            <input type="password" class="form-control form-control-lg rounded-4 soft-input" placeholder="••••••••">
          </div> -->

          <!-- Login button (center) -->
          <!-- <div class="text-center">
            <button class="btn btn-outline-primary rounded-pill px-5 py-2 fw-semibold login-btn">
              Login
            </button>
          </div> -->

          <!-- Links (center) -->
          <!-- <div class="text-center mt-3">
            <a href="#" class="d-block link-primary text-decoration-none mb-2">Forgot your password?</a>
            <a href="#" class="d-block link-primary text-decoration-none" data-bs-toggle="modal" data-bs-target="#signin">Create Account</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template> -->

<!-- <style scoped>
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
} -->

<!-- /* Blur + dim backdrop */
/* :global(.modal-backdrop.show){
  backdrop-filter: blur(6px);
  opacity: .6;
}
</style> */ -->

<script setup>
  import { ref, nextTick } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import * as bootstrap from 'bootstrap'
  import { auth } from '@/services/auth.service'

  const email = ref('')
  const password = ref('')
  const errorMsg = ref('')

  const router = useRouter()
  const route  = useRoute()

  function closeModal() {
    const modalElement = document.getElementById('loginModal')
    if (modalElement) {
      const m = bootstrap.Modal.getInstance(modalElement)
      if (m) {
        m.hide()
      }
    }
  }

  async function openSignUp() {
    closeModal()
    await nextTick()
    const modalElement = document.getElementById('signin')
    if (modalElement) {
      const modal = bootstrap.Modal.getOrCreateInstance(modalElement)
      modal.show()
    }
  }

  async function onSubmit(e) {
    e.preventDefault()
    errorMsg.value = ''
    try {
      await auth.login(email.value.trim(), password.value)
      closeModal()
      
      // Lấy redirect path hoặc mặc định là /quizdash
      const redirectPath = route.query.redirect || '/quizdash'
      
      // Redirect đến trang đích mà không có query params, sau đó reload
      router.push(redirectPath).then(() => {
        // Reload trang để cập nhật navbar
        window.location.reload()
      })
    } catch (err) {
      errorMsg.value = err.message || 'Login failed'
    }
  }
</script>

<template>
  <div class="modal fade" id="loginModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content login-card border-0 shadow-lg">
        <div class="modal-body p-4 p-md-5">
          <button type="button" class="btn-close ms-auto d-block" data-bs-dismiss="modal" aria-label="Close"></button>
          <h3 class="fw-bold mb-4">Login</h3>

          <button type="button" class="btn btn-light w-100 py-3 rounded-4 d-flex align-items-center justify-content-center gap-2 mb-3 border google-btn">
            <img width="20" height="20" alt="g" src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" style="width:20px;height:20px;object-fit:contain"/>
            <span class="fw-semibold">Login with Google</span>
          </button>

          <hr class="my-3">

          <form @submit="onSubmit">
            <div class="mb-3">
              <label class="form-label fw-semibold">Email Address</label>
              <input v-model="email" type="email" class="form-control form-control-lg rounded-4 soft-input" placeholder="student@example.com" required>
            </div>

            <div class="mb-3">
              <label class="form-label fw-semibold">Password</label>
              <input v-model="password" type="password" class="form-control form-control-lg rounded-4 soft-input" placeholder="123456" required>
            </div>

            <div class="text-center">
              <button class="btn btn-outline-primary rounded-pill px-5 py-2 fw-semibold login-btn" type="submit">
                Login
              </button>
            </div>
          </form>

          <div v-if="errorMsg" class="text-danger text-center mt-2">{{ errorMsg }}</div>

          <div class="text-center mt-3">
            <a href="#" class="d-block link-primary text-decoration-none mb-2">Forgot your password?</a>
            <a href="#" 
              class="d-block link-primary text-decoration-none" 
              @click.prevent="openSignUp">
              Create Account
            </a>
          </div>

          <!-- Gợi ý tài khoản demo -->
          <div class="mt-4 small text-muted">
            <div><strong>Demo accounts</strong> (password: <code>123456</code>)</div>
            <ul class="mb-0">
              <li>student@example.com</li>
              <li>teacher@example.com</li>
              <li>admin@example.com</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .login-card { border-radius: 16px; }
  .soft-input { background:#eef2ff; border:1px solid #e6e9f5; }
  .google-btn { border-color:#e6e6e6 !important; }
  .login-btn { border-width:2px; }
  :global(.modal-backdrop.show){ backdrop-filter: blur(6px); opacity:.6; }
</style>
