/** One document returned by `GET /api/v1/documents/pending`. */
export type PendingDocumentDto = {
  id: number
  name: string
  creator_name: string
  sector_name: string
  created_at: string
  suggested_category: { id: number; name: string } | null
  confidence: number | null
}

export type PendingDocumentPage = {
  content: PendingDocumentDto[]
  page: number
  size: number
  total_elements: number
  total_pages: number
}
