/** A page of results, as the server's `PageResponse` answers it. */
export type PageDto<T> = {
  content: T[]
  page: number
  size: number
  total_elements: number
  total_pages: number
}

export type Page<T> = {
  content: T[]
  /** Zero-based. */
  page: number
  size: number
  totalElements: number
  totalPages: number
}
