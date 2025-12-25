<script setup>
  import { computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
  import { useRouter, useRoute, RouterLink } from 'vue-router'
  import { auth } from '@/services/auth.mock'
  import * as bootstrap from 'bootstrap'

  const router = useRouter()
  const route = useRoute()
  const isAuthed = computed(() => auth.isAuthenticated())
  const user = computed(() => auth.currentUser())

  // Khởi tạo dropdown sau khi component render hoặc khi trạng thái đăng nhập thay đổi
  function initDropdown() {
    nextTick(() => {
      const dropdownElement = document.getElementById('userDropdown')
      if (dropdownElement && isAuthed.value) {
        // Khởi tạo dropdown nếu chưa có instance
        bootstrap.Dropdown.getOrCreateInstance(dropdownElement)
      }
    })
  }

  // Toggle dropdown manually
  function toggleDropdown(e) {
    e.preventDefault()
    e.stopPropagation()
    const dropdownElement = document.getElementById('userDropdown')
    if (dropdownElement) {
      const dropdown = bootstrap.Dropdown.getOrCreateInstance(dropdownElement)
      dropdown.toggle()
    }
  }

  // Đóng dropdown khi click outside
  function handleClickOutside(event) {
    // Handle user dropdown
    const dropdownElement = document.getElementById('userDropdown')
    const dropdownMenu = document.querySelector('.dropdown-menu[aria-labelledby="userDropdown"]')
    if (dropdownElement && dropdownMenu) {
      const isClickInside = dropdownElement.contains(event.target) || dropdownMenu.contains(event.target)
      if (!isClickInside) {
        const dropdown = bootstrap.Dropdown.getInstance(dropdownElement)
        if (dropdown) {
          const isShown = dropdownElement.getAttribute('aria-expanded') === 'true'
          if (isShown) {
            dropdown.hide()
          }
        }
      }
    }
  }

  // Watch trạng thái đăng nhập để khởi tạo lại dropdown
  watch(isAuthed, (newVal) => {
    if (newVal) {
      // Delay một chút để đảm bảo DOM đã render
      setTimeout(() => {
        initDropdown()
      }, 100)
    }
  }, { immediate: true })

  onMounted(() => {
    if (isAuthed.value) {
      initDropdown()
    }
    // Thêm event listener để đóng dropdown khi click outside
    document.addEventListener('click', handleClickOutside)
  })

  onUnmounted(() => {
    // Xóa event listener khi component unmount
    document.removeEventListener('click', handleClickOutside)
  })

  async function openLogin() {
    await nextTick()
    const modalElement = document.getElementById('loginModal')
    if (modalElement) {
      // Đóng modal signin nếu đang mở
      const signinModal = bootstrap.Modal.getInstance(document.getElementById('signin'))
      if (signinModal) {
        signinModal.hide()
      }
      // Mở modal login
      const modal = bootstrap.Modal.getOrCreateInstance(modalElement)
      modal.show()
    }
  }
  
  async function openSignUp() {
    await nextTick()
    const modalElement = document.getElementById('signin')
    if (modalElement) {
      // Đóng modal login nếu đang mở
      const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'))
      if (loginModal) {
        loginModal.hide()
      }
      // Mở modal signup
      const modal = bootstrap.Modal.getOrCreateInstance(modalElement)
      modal.show()
    }
  }


  function navigateTo(path) {
    router.push(path)
  }

  function logout() {
    auth.logout()
    // Reload trang để cập nhật navbar
    window.location.reload()
  }

  const menu = [
    { label: 'Home', to: '/', path: '/' },
    { label: 'Create with AI', to: '/create/ai', path: '/create/ai' },
    { label: 'Create from scratch', to: '/create/manual', path: '/create/manual' },
    // {
    //   label: 'Revision',
    //   items: [
    //     { label: 'Study Planner', href: '#' },
    //     { label: 'Notes', href: '#' },
    //   ],
    // },
    // { label: 'AI Flashcard Generator', href: '#' },
    // { label: 'AI Quiz Generator', to: '/quizdash', path: '/quizdash' },
    // {
    //   label: 'More',
    //   items: [
    //     { label: 'Pricing', href: '#' },
    //     { label: 'About', href: '#' },
    //   ],
    // },
  ]

  function isActive(path) {
    return route.path === path
  }

  // Hàm để điều hướng về home - nếu đã đăng nhập thì về quizdash
  function goHome() {
    if (isAuthed.value) {
      router.push('/quizdash')
    } else {
      router.push('/')
    }
  }
</script>

<template>
  <nav class="navbar navbar-expand-lg navbar-blur sticky-top">
    <div class="container-xxl">
      <!-- Brand -->
      <a 
        class="navbar-brand d-flex align-items-center fw-bold" 
        href="#" 
        @click.prevent="goHome">
        <!-- Logo nhỏ (SVG mũ tốt nghiệp) -->
        <!-- <svg class="logo-cap" viewBox="0 0 24 24" fill="none">
          <path d="M12 3L2 8l10 5 10-5-10-5Z" fill="#1E63F3"/>
          <path d="M4 10v5c0 1 3.5 3 8 3s8-2 8-3v-5" stroke="#1E63F3" stroke-width="1.6" />
        </svg> -->
        <link rel="icon" type="image/x-icon" href="../src/assets/pic/quiz.png">
        LetQuiz
      </a>

      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarMain">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarMain">
        <ul class="navbar-nav me-auto mb-2 mb-lg-0">
          <li v-for="item in menu" :key="item.label" class="nav-item" :class="{'dropdown': item.items}">
            <a 
              v-if="!item.items && item.to" 
              class="nav-link" 
              :class="{ 'active': isActive(item.path) }"
              href="#" 
              @click.prevent="item.label === 'Home' ? goHome() : (isAuthed || item.label === 'Home' ? navigateTo(item.to) : openLogin())">
              {{ item.label }}
            </a>
            <a 
              v-else-if="!item.items" 
              class="nav-link" 
              :href="item.href">
              {{ item.label }}
            </a>

            <a 
              v-else 
              class="nav-link dropdown-toggle" 
              href="#" 
              role="button" 
              data-bs-toggle="dropdown">
              {{ item.label }}
            </a>
            <ul v-if="item.items" class="dropdown-menu">
              <li v-for="sub in item.items" :key="sub.label">
                <a class="dropdown-item" :href="sub.href">{{ sub.label }}</a>
              </li>
            </ul>
          </li>
        </ul>

        <div class="d-flex align-items-center gap-2">
          <template v-if="!isAuthed">
            <a href="#" class="text-decoration-none" @click.prevent="openLogin">Login</a>
            <a href="#" class="text-decoration-none" @click.prevent="openSignUp">Sign Up</a>
          </template>
          
          <!-- <a href="#" class="text-decoration-none mx-2" >Login</a> -->
          <!-- <a href="#" class="text-decoration-none mx-2" data-bs-toggle="modal" data-bs-target="#loginModal">Login</a>
          <a href="#" class="text-decoration-none mx-2" data-bs-toggle="modal" data-bs-target="#signin">Sign Up</a> -->

           <template v-else>
              <div class="dropdown">
                <a 
                  class="text-decoration-none dropdown-toggle" 
                  href="#" 
                  role="button" 
                  id="userDropdown"
                  aria-expanded="false"
                  @click.prevent="toggleDropdown">
                  {{ user?.name || 'User' }}
                </a>
                <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                  <li><a class="dropdown-item" href="#" @click.prevent="navigateTo('/profile')">Profile</a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><button class="dropdown-item text-danger" @click="logout">Logout</button></li>
                </ul>
              </div>
            </template>

        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.nav-link {
  font-weight: 500;
}

.create-dropdown-menu {
  min-width: 220px;
  padding: 0.5rem 0;
  border: 1px solid #e9ecef;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.create-dropdown-menu .dropdown-header {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.5rem 1rem 0.25rem;
  margin-bottom: 0;
  color: #ff7a59;
}

.create-dropdown-menu .dropdown-item {
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
}

.create-dropdown-menu .dropdown-item:hover {
  background-color: #f8f9fa;
}

.create-dropdown-menu .dropdown-icon {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #1a1a1a;
  border-radius: 4px;
  flex-shrink: 0;
}

.create-dropdown-menu .dropdown-icon svg {
  width: 12px;
  height: 12px;
}

.text-orange {
  color: #ff7a59;
}
</style>
