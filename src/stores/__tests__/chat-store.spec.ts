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

  describe('detalhes das fontes', () => {
    const source = { document_id: 42, name: 'Manual', category: 'Financeiro' }
    const summary = {
      document_id: 42,
      name: 'Manual',
      description: 'Regras de reembolso',
      mime_type: 'application/pdf',
      category: 'Financeiro',
      responsible_name: 'Ana Souza',
      updated_at: '2026-11-01T10:00:00Z',
    }

    const fetchBy = (routes: Record<string, unknown>) =>
      vi.fn().mockImplementation(async (url: string) => {
        const path = Object.keys(routes).find((route) => url.includes(route))!
        return { ok: true, json: async () => routes[path] }
      })

    it('completa as fontes com descrição, autor e data da listagem de documentos', async () => {
      vi.stubGlobal(
        'fetch',
        fetchBy({
          '/api/v1/chat': { answer: 'Sim.', found: true, sources: [source] },
          '/api/v1/documents': [summary],
        }),
      )
      const store = useChatStore()

      await store.ask('Prazo?')
      await vi.waitFor(() =>
        expect(store.withDetails([source])[0].responsible_name).toBe('Ana Souza'),
      )

      expect(store.withDetails([source])[0]).toMatchObject({
        document_id: 42,
        description: 'Regras de reembolso',
        updated_at: '2026-11-01T10:00:00Z',
      })
    })

    it('mantém a fonte só com nome e categoria quando o documento não está na listagem', async () => {
      vi.stubGlobal(
        'fetch',
        fetchBy({
          '/api/v1/chat': { answer: 'Sim.', found: true, sources: [source] },
          '/api/v1/documents': [],
        }),
      )
      const store = useChatStore()

      await store.ask('Prazo?')
      await store.ask('E agora?')

      expect(store.withDetails([source])).toEqual([source])
    })

    it('não busca de novo os documentos que já conhece', async () => {
      const fetchMock = fetchBy({
        '/api/v1/chat': { answer: 'Sim.', found: true, sources: [source] },
        '/api/v1/documents': [summary],
      })
      vi.stubGlobal('fetch', fetchMock)
      const store = useChatStore()

      await store.ask('Prazo?')
      await vi.waitFor(() => expect(store.withDetails([source])[0].description).toBeDefined())
      await store.ask('E agora?')

      const listCalls = fetchMock.mock.calls.filter(([url]) => url.includes('/api/v1/documents'))
      expect(listCalls).toHaveLength(1)
    })

    it('ignora a falha ao buscar os detalhes', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(async (url: string) => {
          if (url.includes('/api/v1/chat')) {
            return {
              ok: true,
              json: async () => ({ answer: 'Sim.', found: true, sources: [source] }),
            }
          }
          throw new Error('rede')
        }),
      )
      const store = useChatStore()

      await store.ask('Prazo?')

      expect(store.turns[0].status).toBe('done')
      expect(store.withDetails([source])).toEqual([source])
    })
  })
})
