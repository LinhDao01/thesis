<script setup>
  import { useRouter } from 'vue-router'
  import { auth } from '@/services/auth.mock'

  const router = useRouter()

  function toFlashcards() {
    if (auth.isAuthenticated()) {
      router.push('/quizdash')
    } else {
      router.push({ name: 'home', query: { login: '1', redirect: '/quizdash' } })
    }
  }

  function toQuizzes() {
    if (auth.isAuthenticated()) {
      router.push('/quizdash')
    } else {
      router.push({ name: 'home', query: { login: '1', redirect: '/quizdash' } })
    }
  }
</script>

<template>
  <section class="container py-4 py-md-5">
    <div class="hero-card text-center">
      <h1 class="display-5 display-md-4 hero-title">
        Experience a new way of learning<br />
        with the power of AI
      </h1>
      <p class="lead mt-3 hero-subtitle">
        For students, teachers and professionals
      </p>

      <div class="d-flex justify-content-center gap-3 mt-4 flex-wrap">
        <button class="hero-btn" @click="toFlashcards">AI Flashcards</button>
        <button class="hero-btn" @click="toQuizzes">AI Quizzes</button>
      </div>
    </div>
  </section>
</template>
