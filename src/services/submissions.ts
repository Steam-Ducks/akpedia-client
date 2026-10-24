import { API_BASE_URL } from '@/config/api'
import type { ApiError } from '@/types/SearchResult'
import type { SubmissionPage } from '@/types/Submission'

/** Submissions per page, matching the server default. */
export const PAGE_SIZE = 10

export const fetchSubmissions = async (
  page = 0,
  categoryIds: number[] = [],
): Promise<SubmissionPage> => {
  const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) })
  categoryIds.forEach((id) => params.append('categoryIds', String(id)))

  const response = await fetch(`${API_BASE_URL}/api/v1/documents/submissions?${params}`)

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiError | null
    throw new Error(error?.message ?? 'Não foi possível carregar suas submissões.')
  }

  return (await response.json()) as SubmissionPage
}
