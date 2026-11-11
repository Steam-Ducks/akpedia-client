import { defineStore } from 'pinia'
import { ref } from 'vue'
import { acceptTerms, declineTerms, fetchTerms, TermsChangedError } from '@/services/terms'
import type { TermsAcceptance, TermsVersion } from '@/types/Terms'

type TermsStatus = 'idle' | 'loading' | 'done' | 'error'

export const useTermsStore = defineStore('terms', () => {
  const current = ref<TermsVersion | null>(null)
  const accepted = ref<TermsAcceptance | null>(null)
  const status = ref<TermsStatus>('idle')
  const accepting = ref(false)
  const error = ref<string | null>(null)

  /**
   * The current version still has to be accepted. Comes from `GET /me` (`terms_pending`), from a
   * call the server refused with 403 `terms_pending`, and from the terms read on the terms page.
   */
  const pending = ref(false)

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
      // Nothing to accept while none was published.
      pending.value = terms.current !== null && terms.accepted?.version !== terms.current.version
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
      pending.value = false
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

  /**
   * Records that the user declined the version on screen, before their account is deleted:
   * declining means leaving the Akpedia for good. Throws when it cannot be recorded, so nothing is
   * deleted without the record.
   */
  const decline = async () => {
    if (!current.value) return
    await declineTerms(current.value.version)
  }

  return { current, accepted, status, accepting, error, pending, load, accept, decline }
})
