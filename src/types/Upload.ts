/** What `POST /api/v1/documents/analyze` suggests, with nothing persisted. */
export type Analysis = {
  title: string
  description: string | null
  suggestedCategoryId: number | null
  confidence: number | null
}

/** What `POST /api/v1/documents` takes; the author is the logged-in user. */
export type UploadPayload = {
  file: File
  categoryId: number
  name: string
  description: string
  suggestedCategoryId: number | null
  categoryConfidence: number | null
}
