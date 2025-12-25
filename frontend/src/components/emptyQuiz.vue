<script setup>
  import { useRouter } from 'vue-router'
  import { auth } from '@/services/auth.mock'
  import * as bootstrap from 'bootstrap'

  const router = useRouter()

  function createquizAI() {
    if (!auth.isAuthenticated()) {
      // Nếu chưa đăng nhập, điều hướng về home với query để mở modal login
      router.push({ name: 'home', query: { login: '1', redirect: '/create/ai' } })
    } else {
      router.push('/create/ai')
    }
  }

  function createquizScratch() {
    if (!auth.isAuthenticated()) {
      // Nếu chưa đăng nhập, điều hướng về home với query để mở modal login
      router.push({ name: 'home', query: { login: '1', redirect: '/create/manual' } })
    } else {
      router.push('/create/manual')
    }
  }
</script>

<template>
  <div class="d-flex justify-content-between align-items-center mb-2">
    <div></div>
    <div class="text-muted">No Quizzes found</div>
  </div>

  <div class="row g-4 mt-1">
    <div class="col-12 col-lg-6">
      <button class="w-100 card-cta text-start" @click="createquizAI">
        <div class="d-flex align-items-center gap-3">
          <span class="emoji">✨</span>
          <span class="label">Create your first deck with AI</span>
          
        </div>
      </button>
    </div>
    <div class="col-12 col-lg-6">
      <button class="w-100 card-cta text-start" @click="createquizScratch">
        <div class="d-flex align-items-center gap-3">
          <span class="emoji">🃏</span>
          <span class="label">Create your first deck from scratch</span>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
    .card-cta{
    background: #fff; border: 0; border-radius: 18px;
    padding: 28px; box-shadow: 0 6px 18px rgba(22,48,92,.08);
    transition: transform .08s ease, box-shadow .2s ease;
    }
    .card-cta:hover{ transform: translateY(-1px); box-shadow: 0 10px 24px rgba(22,48,92,.12); }
    .emoji{ font-size: 22px; }
    .label{ color: #16305c; font-weight: 700; }
</style>
