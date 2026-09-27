import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ResultPayload } from '@/types/DocData'
import { fetchRecentDocuments, searchDocuments } from '@/services/search'
import { toResultPayload } from '@/services/search-mapper'

type SearchStatus = 'idle' | 'loading' | 'done' | 'error'

export const useResultStore = defineStore('result', () => {
  /** Kept here so the searched text survives moving between pages. */
  const query = ref('')
  const results = ref<ResultPayload[]>([])
  /** Documents shown before anything is searched. */
  const recent = ref<ResultPayload[]>([])
  const result = ref<ResultPayload | null>(null)
  const status = ref<SearchStatus>('idle')
  const error = ref<string | null>(null)

  /** Guards against an older, slower request overwriting the results of a newer one. */
  let latestRequest = 0

  async function search(query: string) {
    const trimmed = query.trim()
    if (!trimmed) {
      return
    }

    const request = ++latestRequest
    status.value = 'loading'
    error.value = null
    result.value = null

    try {
      const found = await searchDocuments(trimmed)
      if (request !== latestRequest) return
      results.value = found.map(toResultPayload)
      status.value = 'done'
    } catch (e) {
      if (request !== latestRequest) return
      results.value = []
      error.value = e instanceof Error ? e.message : 'A busca falhou.'
      status.value = 'error'
    }
  }

  async function loadRecent() {
    try {
      recent.value = (await fetchRecentDocuments()).map(toResultPayload)
    } catch {
      // The list is only a convenience before the first search; the page works without it.
      recent.value = []
    }
  }

  function setResult(newResult: ResultPayload) {
    result.value = newResult
  }

  return { query, results, recent, result, status, error, search, loadRecent, setResult }
})
