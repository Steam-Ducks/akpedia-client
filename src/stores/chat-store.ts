import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ChatTurn } from '@/types/Chat'
import { askQuestion } from '@/services/chat'

export const useChatStore = defineStore('chat', () => {
  const draft = ref('')
  const turns = ref<ChatTurn[]>([])
  let nextId = 0

  const answerTurn = async (turn: ChatTurn) => {
    turn.status = 'loading'
    turn.error = null
    try {
      turn.answer = await askQuestion(turn.question)
      turn.status = 'done'
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

  return { draft, turns, ask, retry }
})
