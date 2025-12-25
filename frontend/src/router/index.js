// import { createRouter, createWebHistory } from 'vue-router'
// import tagQuiz from '../components/tagQuiz.vue'

// // Lazy-load pages
// const home = () => import('../views/home.vue')
// const quizdash = () => import('../views/quizdash.vue')
// const createquizAI = () => import('../views/createquizAI.vue')
// const createquizScratch = () => import('../views/createquizScratch.vue')
// const Tags = () => import('../views/tags.vue')
// const NotFound = () => import('../views/NotFound.vue')

// // mock auth store (sau thay bằng real store)
// const auth = {
//   get token() { return localStorage.getItem('access_token') },
//   isAuthenticated() { return !!localStorage.getItem('access_token') }
// }

// const routes = [
//   { path: '/', name: 'home', component: home },
//   { path: '/quizdash', name: 'quizdash', component: quizdash, meta: { requiresAuth: true } },
//   { path: '/create/ai', name: 'create-ai', component: createquizAI, meta: { requiresAuth: true } },
//   { path: '/create/manual', name: 'create-manual', component: createquizScratch, meta: { requiresAuth: true } },
//   { path: '/tags', name: 'tags', component: tagQuiz, meta: { requiresAuth: true } },
//   { path: '/:pathMatch(.*)*', name: '404', component: NotFound }
// ]

// const router = createRouter({
//   history: createWebHistory(),
//   routes,
//   scrollBehavior() { return { top: 0 } }
// })

// // Global guard (giữ nguyên khi nối backend)
// router.beforeEach((to, from, next) => {
//   if (to.meta.requiresAuth && !auth.isAuthenticated()) {
//     // chuyển hướng về home + mở modal login qua query (UI đã có modal)
//     next({ name: 'home', query: { login: '1', redirect: to.fullPath } })
//   } else {
//     next()
//   }
// })

// export default router

import { createRouter, createWebHistory } from 'vue-router'
import { auth } from '../services/auth.mock'

const home = () => import('../views/home.vue')
const quizdash = () => import('../views/quizdash.vue')
const createquizAI = () => import('../views/createquizAI.vue')
const createquizScratch = () => import('../views/createquizScratch.vue')
const tags = () => import('../views/tags.vue')
const Profile = () => import('../views/Profile.vue')
const QuizPage = () => import('../components/QuizPage.vue')
const DetailPage = () => import('../views/detailPage.vue')
const NotFound = () => import('../views/NotFound.vue')

// const Home = () => import('@/pages/Home.vue')
// const FlashcardsDashboard = () => import('@/pages/FlashcardsDashboard.vue')
// const CreateWithAI = () => import('@/pages/CreateWithAI.vue')
// const CreateFromScratch = () => import('@/pages/CreateFromScratch.vue')
// const Tags = () => import('@/pages/Tags.vue')
// const NotFound = () => import('@/pages/NotFound.vue')

const routes = [
  { path: '/', name: 'home', component: home },
  { path: '/quizdash', name: 'quizdash', component: quizdash, meta: { requiresAuth: true } },
  { path: '/create/ai', name: 'create-ai', component: createquizAI, meta: { requiresAuth: true } },
  { path: '/create/manual', name: 'create-manual', component: createquizScratch, meta: { requiresAuth: true } },
  { path: '/quiz/:id', name: 'quiz', component: QuizPage, meta: { requiresAuth: true } },
  { path: '/quiz/:id/detail', name: 'quiz-detail', component: DetailPage, meta: { requiresAuth: true } },
  { path: '/tags', name: 'tags', component: tags, meta: { requiresAuth: true } },
  { path: '/profile', name: 'profile', component: Profile, meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*', name: '404', component: NotFound }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !auth.isAuthenticated()) {
    next({ name: 'home', query: { login: '1', redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router
