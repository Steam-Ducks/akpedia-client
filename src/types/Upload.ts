export type Category = {
  id: number
  name: string
}

export type PreAnalysis = {
  documentId: number
  suggestedCategoryId: number | null
  categoryConfidence: number | null
  name: string
  description: string
  revision: string
  author: string
  documentDate: string
}

export type SubmitDocumentInput = {
  documentId: number
  categoryId: number
  name: string
  description: string
  revision: string
  author: string
  documentDate: string
}
