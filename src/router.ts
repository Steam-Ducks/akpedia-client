import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { accessRedirect, termsRedirect } from './route-access'
import { sessionUser } from './services/auth'
import { useAccountStore } from './stores/account-store'
import { useTermsStore } from './stores/terms-store'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// While the current terms are pending, every page leads to the terms page, and the terms page
// leads back once they are accepted. Only once GET /me answered: before that, App.vue shows
// nothing and sends the user to the right place when the answer comes.
//
// Each page declares the roles that may open it (definePage meta.roles): the review queue for
// approvers, the admin pages for admins. Anyone else gets the "no permission" page.
router.beforeEach((to) => {
  if (useAccountStore().status === 'done') {
    const terms = termsRedirect(to, useTermsStore().pending)
    if (terms) return terms
  }
  return accessRedirect(to, sessionUser.value?.roles ?? [])
})
