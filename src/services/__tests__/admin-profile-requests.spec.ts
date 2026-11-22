import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  approveProfileRequest,
  fetchProfileRequests,
  rejectProfileRequest,
} from '../admin-profile-requests'

const requestDto = {
  id: 3,
  field: 'email',
  new_value: 'novo@akpedia.local',
  reason: null,
  status: 'PENDING',
  created_at: '2026-11-01T10:00:00Z',
  decided_at: null,
  decision_note: null,
  decided_by_name: null,
  user: { id: 'kc-ana', name: 'Ana Souza', email: 'ana@akpedia.local' },
}

const ok = (body: unknown) => vi.fn().mockResolvedValue({ ok: true, json: async () => body })

describe('admin profile requests service', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('asks for the pending requests by default and maps them', async () => {
    const fetchMock = ok({
      content: [requestDto],
      page: 0,
      size: 20,
      total_elements: 1,
      total_pages: 1,
    })
    vi.stubGlobal('fetch', fetchMock)

    const page = await fetchProfileRequests()

    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost')
    expect(url.pathname).toBe('/api/v1/admin/profile-requests')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      status: 'PENDING',
      page: '0',
      size: '20',
    })
    expect(page.totalElements).toBe(1)
    expect(page.content[0]).toMatchObject({
      id: 3,
      newValue: 'novo@akpedia.local',
      decidedAt: null,
      user: { id: 'kc-ana', name: 'Ana Souza', email: 'ana@akpedia.local' },
    })
  })

  it('can ask for every status', async () => {
    const fetchMock = ok({ content: [], page: 1, size: 10, total_elements: 0, total_pages: 0 })
    vi.stubGlobal('fetch', fetchMock)

    await fetchProfileRequests({ status: 'ALL', page: 1, size: 10 })

    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost')
    expect(url.searchParams.get('status')).toBe('ALL')
    expect(url.searchParams.get('page')).toBe('1')
  })

  it('approves with a POST', async () => {
    const fetchMock = ok({ ...requestDto, status: 'APPROVED' })
    vi.stubGlobal('fetch', fetchMock)

    const request = await approveProfileRequest(3)

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/admin/profile-requests/3/approve')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(request.status).toBe('APPROVED')
  })

  it('rejects with the note, trimmed, or none', async () => {
    const fetchMock = ok({ ...requestDto, status: 'REJECTED' })
    vi.stubGlobal('fetch', fetchMock)

    await rejectProfileRequest(3, ' Use o e-mail do setor. ')
    await rejectProfileRequest(3, '  ')

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/admin/profile-requests/3/reject')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      note: 'Use o e-mail do setor.',
    })
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ note: null })
  })

  it.each([
    ['change_request_not_pending', 'já foi analisada'],
    ['user_exists', 'Já existe uma conta com este e-mail.'],
  ])('explains %s', async (code, message) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ code }) }),
    )

    await expect(approveProfileRequest(3)).rejects.toThrow(message)
  })
})
