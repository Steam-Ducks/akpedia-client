import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { acceptTerms, fetchTerms, TermsChangedError } from '@/services/terms'
import type { TermsAcceptance, TermsVersion } from '@/types/Terms'

type TermsStatus = 'idle' | 'loading' | 'done' | 'error'

export const useTermsStore = defineStore('terms', () => {
  const current = ref<TermsVersion | null>(null)
  const accepted = ref<TermsAcceptance | null>(null)
  const status = ref<TermsStatus>('idle')
  const accepting = ref(false)
  const error = ref<string | null>(null)

  /** The current version still has to be accepted. Nothing to accept while none was published. */
  const pending = computed(
    () => current.value !== null && accepted.value?.version !== current.value.version,
  )

  /** Guards against an older, slower request overwriting the result of a newer one. */
  let latestRequest = 0

  const load = async () => {
    const request = ++latestRequest
    // A reload keeps what is on screen until the answer comes.
    if (status.value !== 'done') status.value = 'loading'

    try {
      const terms = await fetchTerms()
      if (request !== latestRequest) return
      current.value = terms.current
      accepted.value = terms.accepted
      status.value = 'done'
    } catch (e) {
      if (request !== latestRequest) return
      error.value = e instanceof Error ? e.message : 'Não foi possível carregar os termos de uso.'
      if (status.value !== 'done') status.value = 'error'
    }
  }

  const accept = async () => {
    if (!current.value) return
    accepting.value = true
    error.value = null

    try {
      accepted.value = await acceptTerms(current.value.version)
    } catch (e) {
      if (e instanceof TermsChangedError) {
        // A newer version was published while this one was on screen: show that one instead.
        await load()
        error.value = 'Os termos mudaram enquanto você lia. Confira a nova versão.'
      } else {
        error.value = e instanceof Error ? e.message : 'Não foi possível aceitar os termos de uso.'
      }
    } finally {
      accepting.value = false
    }
  }

  return { current, accepted, status, accepting, error, pending, load, accept }
})
