export type ChatSource = {
  document_id: number
  name: string
  category: string
}

export type ChatAnswer = {
  answer: string
  found: boolean
  sources: ChatSource[]
}

export type ChatTurn = {
  id: number
  question: string
  status: 'loading' | 'done' | 'error'
  answer: ChatAnswer | null
  error: string | null
}
