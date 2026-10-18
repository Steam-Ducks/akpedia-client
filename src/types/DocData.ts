export type DocData = {
  id: number
  title: string
  category: string
  shortDescription: string
  responsableName: string
  lastUpdate: Date
}

export type ResultPayload = {
  documentData: DocData
  /**
   * Relevance of a search result; absent when the document was not found by a search, null when
   * the search had no text to compare against, such as a category filter used alone.
   */
  accuracy?: number | null
}
