<script setup>
  import { onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { auth } from '@/services/auth.mock'
  import Banner from '../components/Banner.vue'

  const router = useRouter()

  onMounted(() => {
    // Nếu đã đăng nhập, redirect đến quizdash
    if (auth.isAuthenticated()) {
      router.push('/quizdash')
    }
  })
</script>
<template>
  <Banner />
</template>
