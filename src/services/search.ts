import { API_BASE_URL } from '@/config/api'
import type { ApiError, DocumentSummary, SearchResult } from '@/types/SearchResult'

/** Largest limit the server accepts (`akpedia.search.max-limit`), so every match comes back. */
const SEARCH_LIMIT = 50

/** How many documents the home page lists before anything is searched. */
const RECENT_LIMIT = 5

async function getJson<T>(path: string, params: URLSearchParams, failure: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}?${params}`)

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiError | null
    throw new Error(error?.message ?? `${failure} (HTTP ${response.status}).`)
  }

  return (await response.json()) as T
}

export function searchDocuments(query: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query, limit: String(SEARCH_LIMIT) })
  return getJson('/api/v1/search', params, 'A busca falhou')
}

export function fetchRecentDocuments(): Promise<DocumentSummary[]> {
  const params = new URLSearchParams({ limit: String(RECENT_LIMIT) })
  return getJson('/api/v1/documents', params, 'Não foi possível carregar os documentos')
}
