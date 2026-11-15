import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from '../chat-store'

const answer = { answer: 'Sim [1].', found: true, sources: [] }

describe('chat store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
  })

  it('guarda cada pergunta com a sua resposta, em ordem, e limpa o rascunho', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => answer }))
    const store = useChatStore()
    store.draft = '  Posso?  '

    await store.ask('  Posso?  ')
    await store.ask('E agora?')

    expect(store.draft).toBe('')
    expect(store.turns.map((t) => t.question)).toEqual(['Posso?', 'E agora?'])
    expect(store.turns.every((t) => t.status === 'done')).toBe(true)
    expect(store.turns[0].answer).toEqual(answer)
  })

  it('ignora pergunta em branco', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const store = useChatStore()

    await store.ask('   ')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(store.turns).toEqual([])
  })

  it('mostra carregando enquanto espera', async () => {
    let finish: (value: unknown) => void = () => {}
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise((resolve) => (finish = resolve))))
    const store = useChatStore()

    const pending = store.ask('Oi')
    await vi.waitFor(() => expect(store.turns[0].status).toBe('loading'))
    finish({ ok: true, json: async () => answer })
    await pending

    expect(store.turns[0].status).toBe('done')
  })

  it('mantém a pergunta num 503 e permite reenviar', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ code: 'chat_unavailable', message: 'x' }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => answer })
    vi.stubGlobal('fetch', fetchMock)
    const store = useChatStore()

    await store.ask('Oi')
    expect(store.turns[0].status).toBe('error')
    expect(store.turns[0].error).toContain('indisponível')
    expect(store.turns[0].question).toBe('Oi')

    await store.retry(store.turns[0].id)
    expect(store.turns[0].status).toBe('done')
    expect(store.turns).toHaveLength(1)
  })
})
