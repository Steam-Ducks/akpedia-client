import { API_BASE_URL } from '@/config/api'

/** Body of every error the API answers. */
type ApiError = {
  code: string
  message: string
}

/** Answer of `GET /api/v1/documents/{id}/preview`. */
export type DocumentPreview = {
  document_id: number
  name: string
  page_count: number
}

async function failure(response: Response, fallback: string): Promise<Error> {
  const error = (await response.json().catch(() => null)) as ApiError | null
  return new Error(error?.message ?? `${fallback} (HTTP ${response.status}).`)
}

export async function fetchDocumentPreview(documentId: number): Promise<DocumentPreview> {
  const response = await fetch(`${API_BASE_URL}/api/v1/documents/${documentId}/preview`)
  if (!response.ok) {
    throw await failure(response, 'Não foi possível abrir o documento')
  }
  return (await response.json()) as DocumentPreview
}

/** One page rendered by the server; the PDF itself never reaches the browser. */
export async function fetchDocumentPage(documentId: number, page: number): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/documents/${documentId}/preview/pages/${page}`,
    { cache: 'no-store' },
  )
  if (!response.ok) {
    throw await failure(response, `Não foi possível carregar a página ${page}`)
  }
  return response.blob()
}
