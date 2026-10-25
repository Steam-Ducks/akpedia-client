import { API_BASE_URL } from '@/config/api'
import type { ApiError, Category, DocumentSummary, SearchResult } from '@/types/SearchResult'

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

/**
 * Searches by text, by category, or both. At least one of `query` and `categoryIds` must be
 * given -- the server answers 400 otherwise.
 */
export function searchDocuments(
  query: string,
  categoryIds: number[] = [],
): Promise<SearchResult[]> {
  const params = new URLSearchParams({ limit: String(SEARCH_LIMIT) })
  if (query) {
    params.set('q', query)
  }
  categoryIds.forEach((id) => params.append('categoryIds', String(id)))
  return getJson('/api/v1/search', params, 'A busca falhou')
}

export function fetchRecentDocuments(): Promise<DocumentSummary[]> {
  const params = new URLSearchParams({ limit: String(RECENT_LIMIT) })
  return getJson('/api/v1/documents', params, 'Não foi possível carregar os documentos')
}

/** The whole category catalog, used to populate the search filter. */
export function fetchCategories(): Promise<Category[]> {
  return getJson(
    '/api/v1/categories',
    new URLSearchParams(),
    'Não foi possível carregar as categorias',
  )
}
