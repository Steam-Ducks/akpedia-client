import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchSubmissions } from '@/services/submissions'
import { toSubmission, type Submission } from '@/services/submission-mapper'

type SubmissionListStatus = 'idle' | 'loading' | 'done' | 'error'

export const useSubmissionStore = defineStore('submission', () => {
  const submissions = ref<Submission[]>([])
  const status = ref<SubmissionListStatus>('idle')
  const error = ref<string | null>(null)

  /** Guards against an older, slower request overwriting the result of a newer one. */
  let latestRequest = 0

  const load = async () => {
    const request = ++latestRequest
    if (status.value === 'idle') status.value = 'loading'
    error.value = null

    try {
      const page = await fetchSubmissions()
      if (request !== latestRequest) return
      submissions.value = page.content.map(toSubmission)
      status.value = 'done'
    } catch (e) {
      if (request !== latestRequest) return
      error.value = e instanceof Error ? e.message : 'Não foi possível carregar suas submissões.'
      status.value = 'error'
    }
  }

  return { submissions, status, error, load }
})
