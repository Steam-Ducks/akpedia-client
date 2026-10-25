/** What `POST /api/v1/documents/analyze` suggests, with nothing persisted. */
export type Analysis = {
  title: string
  description: string | null
  suggestedCategoryId: number | null
  confidence: number | null
}

/** What `POST /api/v1/documents` takes, besides the author attributed from `VITE_DEFAULT_USER_ID`. */
export type UploadPayload = {
  file: File
  categoryId: number
  name: string
  description: string
  suggestedCategoryId: number | null
  categoryConfidence: number | null
}
