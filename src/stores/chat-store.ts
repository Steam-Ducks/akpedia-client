import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatSource, ChatSourceDetails, ChatTurn } from '@/types/Chat'
import type { DocumentSummary } from '@/types/SearchResult'
import { askQuestion } from '@/services/chat'
import { fetchRecentDocuments, MAX_RECENT_LIMIT } from '@/services/search'

export const useChatStore = defineStore('chat', () => {
  const draft = ref('')
  const turns = ref<ChatTurn[]>([])
  const summaries = ref<Record<number, DocumentSummary>>({})
  const lookedUp = new Set<number>()
  let nextId = 0

  const loadSummaries = async (sources: ChatSource[]) => {
    const missing = sources.filter(
      (source) => !summaries.value[source.document_id] && !lookedUp.has(source.document_id),
    )
    if (missing.length === 0) return
    missing.forEach((source) => lookedUp.add(source.document_id))
    try {
      const documents = await fetchRecentDocuments(MAX_RECENT_LIMIT)
      documents.forEach((document) => {
        summaries.value[document.document_id] = document
      })
    } catch {
      missing.forEach((source) => lookedUp.delete(source.document_id))
    }
  }

  const withDetails = (sources: ChatSource[]): ChatSourceDetails[] =>
    sources.map((source) => {
      const summary = summaries.value[source.document_id]
      return summary
        ? {
            ...source,
            description: summary.description,
            responsible_name: summary.responsible_name,
            updated_at: summary.updated_at,
          }
        : source
    })

  const answerTurn = async (turn: ChatTurn) => {
    turn.status = 'loading'
    turn.error = null
    try {
      turn.answer = await askQuestion(turn.question)
      turn.status = 'done'
      loadSummaries(turn.answer.sources)
    } catch (e) {
      turn.error = e instanceof Error ? e.message : 'A pergunta falhou.'
      turn.status = 'error'
    }
  }

  const ask = async (question: string) => {
    const trimmed = question.trim()
    if (!trimmed) return
    turns.value.push({
      id: nextId++,
      question: trimmed,
      status: 'loading',
      answer: null,
      error: null,
    })
    const turn = turns.value[turns.value.length - 1]
    draft.value = ''
    await answerTurn(turn)
  }

  const retry = async (id: number) => {
    const turn = turns.value.find((t) => t.id === id)
    if (turn && turn.status === 'error') await answerTurn(turn)
  }

  return { draft, turns, ask, retry, withDetails }
})
