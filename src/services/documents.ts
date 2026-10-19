import { API_BASE_URL } from '@/config/api'
import type { ApiError } from '@/types/SearchResult'
import type { Analysis, UploadPayload } from '@/types/Upload'

/** Author attributed to every upload while there is no registration nor login (see akpedia-server's README). */
const DEFAULT_USER_ID = import.meta.env.VITE_DEFAULT_USER_ID

/** Used when the server answers an error with no body, or one with no `message`. */
const DEFAULT_MESSAGES: Record<number, string> = {
  413: 'O arquivo é grande demais.',
  415: 'Formato não suportado. Envie um PDF, Word ou Excel.',
  422: 'Não foi possível converter o arquivo.',
  503: 'O serviço de classificação está indisponível. Preencha os campos manualmente.',
}

/** Raised on a non-2xx answer, carrying the status so the screen can special-case 503. */
export class DocumentApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Wire shape of `POST /api/v1/documents/analyze`'s answer. */
type AnalysisResponse = {
  title: string
  description: string | null
  suggested_category_id: number | null
  confidence: number | null
}

async function postMultipart<T>(path: string, body: FormData, failure: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', body })

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiError | null
    const message =
      error?.message ?? DEFAULT_MESSAGES[response.status] ?? `${failure} (HTTP ${response.status}).`
    throw new DocumentApiError(response.status, message)
  }

  return (await response.json()) as T
}

/** Suggests a title, description and category for a file; nothing is stored. */
export async function analyze(file: File): Promise<Analysis> {
  const body = new FormData()
  body.append('file', file)

  const result = await postMultipart<AnalysisResponse>(
    '/api/v1/documents/analyze',
    body,
    'A análise falhou',
  )

  return {
    title: result.title,
    description: result.description,
    suggestedCategoryId: result.suggested_category_id,
    confidence: result.confidence,
  }
}

/** Uploads a document, converted to PDF and stored pending approval. */
export function upload(payload: UploadPayload): Promise<void> {
  const body = new FormData()
  body.append('file', payload.file)
  body.append('categoryId', String(payload.categoryId))
  if (DEFAULT_USER_ID) body.append('creatorId', DEFAULT_USER_ID)
  if (payload.name) body.append('name', payload.name)
  if (payload.description) body.append('description', payload.description)
  if (payload.suggestedCategoryId !== null) {
    body.append('suggestedCategoryId', String(payload.suggestedCategoryId))
  }
  if (payload.categoryConfidence !== null) {
    body.append('categoryConfidence', String(payload.categoryConfidence))
  }

  return postMultipart('/api/v1/documents', body, 'O envio falhou')
}
