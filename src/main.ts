import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { initAuth } from './services/auth'

import './assets/css/main.css'

// Every screen talks to the API as the logged-in user, so nothing is mounted before the login.
// The router is loaded only afterwards: it reads the URL when created, and the login leaves
// Keycloak's answer in it until initAuth clears it.
initAuth()
  .then(async () => {
    const { router } = await import('./router')
    createApp(App).use(createPinia()).use(router).mount('#app')
  })
  .catch(() => {
    document.getElementById('app')!.textContent =
      'Não foi possível conectar ao serviço de login. Tente novamente em instantes.'
  })
