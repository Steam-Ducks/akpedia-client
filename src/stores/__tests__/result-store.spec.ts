import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useResultStore } from '../result-store'
import type { SearchResult } from '@/types/SearchResult'

const found: SearchResult[] = [
  {
    document_id: 1,
    name: 'Manual de Integração',
    description: null,
    mime_type: 'application/pdf',
    score: 0.91,
    matched_chunk: 'Procedimentos para integração…',
    chunk_index: 2,
    category: 'Manuais',
    responsible_name: 'ana',
    updated_at: '2026-09-26T01:27:40.907651Z',
  },
]

describe('result store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('busca na API pedindo todos os resultados e guarda a lista', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => found })
    vi.stubGlobal('fetch', fetchMock)

    const store = useResultStore()
    await store.search('  integração  ')

    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost')
    expect(url.pathname).toBe('/api/v1/search')
    expect(url.searchParams.get('q')).toBe('integração')
    expect(url.searchParams.get('limit')).toBe('50')
    expect(store.status).toBe('done')
    expect(store.results).toHaveLength(1)
    expect(store.results[0].accuracy).toBe(0.91)
    expect(store.results[0].documentData).toMatchObject({
      id: 1,
      title: 'Manual de Integração',
      shortDescription: 'Procedimentos para integração…',
      category: 'Manuais',
      responsableName: 'ana',
      lastUpdate: new Date('2026-09-26T01:27:40.907651Z'),
    })
  })

  it('expõe a mensagem de erro da API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ code: 'EMBEDDING_UNAVAILABLE', message: 'Serviço indisponível.' }),
      }),
    )

    const store = useResultStore()
    await store.search('integração')

    expect(store.status).toBe('error')
    expect(store.error).toBe('Serviço indisponível.')
    expect(store.results).toEqual([])
  })

  it('carrega os documentos recentes, sem relevância', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          document_id: 3,
          name: 'Norma de Segurança',
          description: 'Regras de acesso',
          mime_type: 'application/pdf',
          category: 'Normativa',
          responsible_name: 'ana',
          updated_at: '2026-09-25T10:00:00Z',
        },
      ],
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useResultStore()
    await store.loadRecent()

    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost')
    expect(url.pathname).toBe('/api/v1/documents')
    expect(url.searchParams.get('limit')).toBe('5')
    expect(store.recent).toHaveLength(1)
    expect(store.recent[0].accuracy).toBeUndefined()
    expect(store.recent[0].documentData).toMatchObject({
      id: 3,
      title: 'Norma de Segurança',
      shortDescription: 'Regras de acesso',
      category: 'Normativa',
    })
  })

  it('usa o trecho inicial do documento quando não há descrição', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            document_id: 4,
            name: 'manual.pdf',
            description: null,
            mime_type: 'application/pdf',
            category: 'Manuais',
            responsible_name: 'ana',
            updated_at: '2026-09-25T10:00:00Z',
            excerpt: 'Manual de teste do akpedia.',
          },
        ],
      }),
    )

    const store = useResultStore()
    await store.loadRecent()

    expect(store.recent[0].documentData.shortDescription).toBe('Manual de teste do akpedia.')
  })

  it('ignora buscas em branco sem categorias', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await useResultStore().search('   ')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('busca por categoria mesmo com o texto em branco', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => found })
    vi.stubGlobal('fetch', fetchMock)

    const store = useResultStore()
    await store.search('   ', [1, 3])

    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost')
    expect(url.searchParams.has('q')).toBe(false)
    expect(url.searchParams.getAll('categoryIds')).toEqual(['1', '3'])
    expect(store.status).toBe('done')
  })

  it('combina texto e categorias na mesma busca', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => found })
    vi.stubGlobal('fetch', fetchMock)

    const store = useResultStore()
    await store.search('integração', [2])

    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost')
    expect(url.searchParams.get('q')).toBe('integração')
    expect(url.searchParams.getAll('categoryIds')).toEqual(['2'])
  })

  it('carrega o catálogo de categorias', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 1, name: 'Engenharia', description: null },
        { id: 2, name: 'Normativa', description: 'Políticas internas' },
      ],
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useResultStore()
    await store.loadCategories()

    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost')
    expect(url.pathname).toBe('/api/v1/categories')
    expect(store.categories).toHaveLength(2)
    expect(store.categories[0].name).toBe('Engenharia')
  })

  it('alterna uma categoria selecionada e busca com a seleção atualizada', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => found })
    vi.stubGlobal('fetch', fetchMock)

    const store = useResultStore()
    store.toggleCategory(1)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(store.categoryIds).toEqual([1])

    store.toggleCategory(2)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(store.categoryIds).toEqual([1, 2])

    store.toggleCategory(1)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    expect(store.categoryIds).toEqual([2])
  })

  it('um resultado de busca só por categoria carrega relevância nula', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ ...found[0], score: null }],
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useResultStore()
    await store.search('', [1])

    expect(store.results[0].accuracy).toBeNull()
  })
})
