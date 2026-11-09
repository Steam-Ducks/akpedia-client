import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { accessRedirect } from './route-access'
import { sessionUser } from './services/auth'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Each page declares the roles that may open it (definePage meta.roles): the review queue for
// approvers, the admin pages for admins. Anyone else gets the "no permission" page.
router.beforeEach((to) => accessRedirect(to, sessionUser.value?.roles ?? []))
