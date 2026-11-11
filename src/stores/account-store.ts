import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchAccountStatus } from '@/services/account'
import { useCpfStore } from '@/stores/cpf-store'
import { useTermsStore } from '@/stores/terms-store'

type AccountStatus = 'idle' | 'loading' | 'done' | 'error'

/**
 * What the app has to know about the account before opening any page, read once from
 * `GET /api/v1/me`: whether the current terms are still to be accepted, and whether the server
 * refuses the CPF. Each answer goes to its own store.
 */
export const useAccountStore = defineStore('account', () => {
  const status = ref<AccountStatus>('idle')
  const error = ref<string | null>(null)

  const load = async () => {
    if (status.value !== 'done') status.value = 'loading'
    error.value = null
    try {
      const me = await fetchAccountStatus()
      useTermsStore().pending = me.termsPending
      useCpfStore().problem = me.cpfProblem
      status.value = 'done'
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Não foi possível carregar a sua conta.'
      if (status.value !== 'done') status.value = 'error'
    }
  }

  return { status, error, load }
})
