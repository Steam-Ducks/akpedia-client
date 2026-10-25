import { describe, it, expect, vi, afterEach } from 'vitest'
import { approveDocument, rejectDocument } from '../document-review'

describe('document review service', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('approves with the given corrections', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    await approveDocument(7, { name: 'Manual de calibracao', categoryId: 4 })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v1/documents/7/approve')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ name: 'Manual de calibracao', categoryId: 4 })
  })

  it('omits a correction that was not given', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    await approveDocument(7, { name: 'manual.pdf' })

    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({ name: 'manual.pdf' })
  })

  it('rejects with a comment', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    await rejectDocument(7, 'Falta a seção de revisão A.')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v1/documents/7/reject')
    expect(JSON.parse(init.body)).toEqual({ comment: 'Falta a seção de revisão A.' })
  })

  it('rejects the promise with the server message on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ code: 'document_not_pending_approval', message: 'Já foi decidido.' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(approveDocument(7, {})).rejects.toThrow('Já foi decidido.')
  })

  it('uses a default message when the server answers with no body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => null })
    vi.stubGlobal('fetch', fetchMock)

    await expect(rejectDocument(7, 'motivo')).rejects.toThrow('A devolução falhou')
  })
})
