import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchPendingDocuments } from '../pending-documents'

describe('pending documents service', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists the pending documents page', async () => {
    const page = {
      content: [
        {
          id: 12,
          name: 'manual-vpn.pdf',
          description: null,
          creator_name: 'Mariana Costa',
          sector_name: 'Engenharia',
          created_at: '2026-10-13T19:06:15.123Z',
          category: { id: 1, name: 'Tecnico' },
          suggested_category: { id: 1, name: 'Tecnico' },
          confidence: 0.87,
        },
      ],
      page: 0,
      size: 50,
      total_elements: 1,
      total_pages: 1,
    }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => page })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchPendingDocuments()

    expect(result).toEqual(page)
    const [url] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v1/documents/pending')
  })

  it('rejects with the server message on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ code: 'internal_error', message: 'Falhou.' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchPendingDocuments()).rejects.toThrow('Falhou.')
  })

  it('uses a default message when the server answers with no body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => null })
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchPendingDocuments()).rejects.toThrow(
      'Não foi possível carregar os documentos pendentes.',
    )
  })
})
