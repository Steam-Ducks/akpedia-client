import { API_BASE_URL } from '@/config/api'
import type { ApiError } from '@/types/SearchResult'
import type { SubmissionPage } from '@/types/Submission'

/** Largest page the screen asks for, so a single page covers every submission in practice. */
const PAGE_SIZE = 50

export const fetchSubmissions = async (): Promise<SubmissionPage> => {
  const params = new URLSearchParams({ page: '0', size: String(PAGE_SIZE) })
  const response = await fetch(`${API_BASE_URL}/api/v1/documents/submissions?${params}`)

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiError | null
    throw new Error(error?.message ?? 'Não foi possível carregar suas submissões.')
  }

  return (await response.json()) as SubmissionPage
}
