import { apiFetch } from '@/services/api'
import type { ChatAnswer } from '@/types/Chat'
import type { ApiError } from '@/types/SearchResult'

export const MAX_QUESTION_LENGTH = 1000

export class ChatUnavailableError extends Error {}

export const askQuestion = async (question: string): Promise<ChatAnswer> => {
  const response = await apiFetch('/api/v1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })

  if (response.ok) return (await response.json()) as ChatAnswer

  const error = (await response.json().catch(() => null)) as ApiError | null
  if (response.status === 503 || error?.code === 'chat_unavailable') {
    throw new ChatUnavailableError('O assistente está indisponível. Tente novamente mais tarde.')
  }
  throw new Error(error?.message ?? `A pergunta falhou (HTTP ${response.status}).`)
}

export const stripPassageMarkers = (answer: string): string =>
  answer
    .replace(/\s*\[\d+(?:\s*,\s*\d+)*\]/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
