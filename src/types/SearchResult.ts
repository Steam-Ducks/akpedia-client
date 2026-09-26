/** One document returned by `GET /api/v1/documents`. */
export type DocumentSummary = {
  document_id: number
  name: string
  description: string | null
  mime_type: string
  category: string
  /** Name of the user who uploaded the document. */
  responsible_name: string
  /** ISO 8601 instant the document last changed; its creation time if it never has. */
  updated_at: string
  /** Start of the document's text, trimmed like a search snippet; null when it has none. */
  excerpt?: string | null
}

/** One document returned by `GET /api/v1/search`, represented by its best matching chunk. */
export type SearchResult = DocumentSummary & {
  /** Cosine similarity between the query and the matched chunk, from -1 to 1. */
  score: number
  matched_chunk: string | null
  /** Position of the matched chunk in the document, counted from 0. */
  chunk_index: number
}

/** Body of every error the API answers. */
export type ApiError = {
  code: string
  message: string
}
