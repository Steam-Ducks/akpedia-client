import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchPendingDocuments } from '@/services/pending-documents'
import { toPendingDocument, type PendingDocument } from '@/services/pending-mapper'

type PendingListStatus = 'idle' | 'loading' | 'done' | 'error'

export const usePendingStore = defineStore('pending', () => {
  const pendingDocuments = ref<PendingDocument[]>([])
  const status = ref<PendingListStatus>('idle')
  const error = ref<string | null>(null)

  /** Guards against an older, slower request overwriting the result of a newer one. */
  let latestRequest = 0

  const load = async () => {
    const request = ++latestRequest
    if (status.value === 'idle') status.value = 'loading'
    error.value = null

    try {
      const page = await fetchPendingDocuments()
      if (request !== latestRequest) return
      pendingDocuments.value = page.content.map(toPendingDocument)
      status.value = 'done'
    } catch (e) {
      if (request !== latestRequest) return
      error.value =
        e instanceof Error ? e.message : 'Não foi possível carregar os documentos pendentes.'
      status.value = 'error'
    }
  }

  return { pendingDocuments, status, error, load }
})
