<script setup>
  import { watch, nextTick } from 'vue'
  import { useRoute } from 'vue-router'
  import AppNavbar from './components/AppNavBar.vue'
  import Footer from './components/Footer.vue'
  import Login from './components/Login.vue'
  import Sign_Up from './components/Sign_Up.vue'
  import { RouterView } from 'vue-router'
  import * as bootstrap from 'bootstrap'
  import { auth } from './services/auth.service'

  const route = useRoute()

  // Theo dõi query để tự mở modal login khi cần
  watch(() => route.query.login, async (newVal) => {
    // Chỉ mở modal nếu có query login=1 VÀ chưa đăng nhập
    if (newVal === '1' && !auth.isAuthenticated()) {
      await nextTick()
      // Delay nhỏ để đảm bảo modal đã được render
      setTimeout(() => {
        const modalElement = document.getElementById('loginModal')
        if (modalElement) {
          const modal = bootstrap.Modal.getOrCreateInstance(modalElement)
          modal.show()
        }
      }, 100)
    }
  }, { immediate: true })
</script>

<template>
  <AppNavbar />
  <RouterView />
  <!-- <Footer /> -->
  <Login />
  <Sign_Up />
</template>
