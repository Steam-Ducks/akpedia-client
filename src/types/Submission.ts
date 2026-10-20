/** Status of a submission as the uploader sees it, derived by the server from the stored one. */
export type SubmissionStatus =
  'UNDER_REVIEW' | 'PROCESSING' | 'PUBLISHED' | 'INDEXING_FAILED' | 'RETURNED'

/** One row of `GET /api/v1/documents/submissions`. */
export type SubmissionDto = {
  document_id: number
  name: string
  description: string | null
  category: string
  submission_status: SubmissionStatus
  review_comment?: string
  reviewed_at?: string
  created_at: string
  updated_at: string | null
}

export type SubmissionPage = {
  content: SubmissionDto[]
  page: number
  size: number
  total_elements: number
  total_pages: number
}
