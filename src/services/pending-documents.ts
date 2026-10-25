import { API_BASE_URL } from '@/config/api'
import type { ApiError } from '@/types/SearchResult'
import type { PendingDocumentPage } from '@/types/PendingDocument'

/** Largest page the panel asks for, so a single page covers every pending document in practice. */
const PAGE_SIZE = 50

export const fetchPendingDocuments = async (): Promise<PendingDocumentPage> => {
  const params = new URLSearchParams({ page: '0', size: String(PAGE_SIZE) })
  const response = await fetch(`${API_BASE_URL}/api/v1/documents/pending?${params}`)

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiError | null
    throw new Error(error?.message ?? 'Não foi possível carregar os documentos pendentes.')
  }

  return (await response.json()) as PendingDocumentPage
}
