import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { sessionUser } from './services/auth'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// The review queue is for approvers; the server refuses it to anyone else anyway.
router.beforeEach((to) => {
  if (to.path.startsWith('/review') && !sessionUser.value?.canReview) return '/'
})
