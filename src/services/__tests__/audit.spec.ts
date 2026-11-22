import { describe, it, expect, vi, afterEach } from 'vitest'
import { auditActionLabel, auditEntityLabel, fetchAuditActions, fetchAuditLog } from '../audit'

const entryDto = {
  id: 7,
  created_at: '2026-11-07T13:00:00Z',
  action: 'TERMS_ACCEPTED',
  user_email: 'ana@akpedia.local',
  user_name: 'Ana Souza',
  entity_type: 'TERMS_VERSION',
  entity_id: 3,
  details: { version: 3 },
  ip_address: '10.0.0.1',
  user_agent: 'Firefox',
  http_method: 'POST',
  path: '/api/v1/terms/accept',
  status_code: 200,
  duration_ms: 12,
}

const ok = (body: unknown) => vi.fn().mockResolvedValue({ ok: true, json: async () => body })

describe('audit service', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps the pseudonym of a deleted user', async () => {
    vi.stubGlobal(
      'fetch',
      ok({
        content: [
          {
            ...entryDto,
            user_email: null,
            user_name: null,
            user_pseudonym: 'Usuário removido #12',
            ip_address: null,
            user_agent: null,
          },
        ],
        page: 0,
        size: 50,
        total_elements: 1,
        total_pages: 1,
      }),
    )

    const [entry] = (await fetchAuditLog()).content

    expect(entry.userPseudonym).toBe('Usuário removido #12')
    expect(entry.userEmail).toBeNull()
  })

  it('asks for events by default and maps the entries', async () => {
    const fetchMock = ok({
      content: [entryDto],
      page: 0,
      size: 50,
      total_elements: 1,
      total_pages: 1,
    })
    vi.stubGlobal('fetch', fetchMock)

    const page = await fetchAuditLog()

    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost')
    expect(url.pathname).toBe('/api/v1/admin/audit')
    expect(Object.fromEntries(url.searchParams)).toEqual({ kind: 'EVENT', page: '0', size: '50' })
    expect(page.totalPages).toBe(1)
    expect(page.content[0]).toEqual({
      id: 7,
      createdAt: new Date('2026-11-07T13:00:00Z'),
      action: 'TERMS_ACCEPTED',
      userEmail: 'ana@akpedia.local',
      userName: 'Ana Souza',
      userPseudonym: null,
      entityType: 'TERMS_VERSION',
      entityId: 3,
      details: { version: 3 },
      ipAddress: '10.0.0.1',
      userAgent: 'Firefox',
      httpMethod: 'POST',
      path: '/api/v1/terms/accept',
      statusCode: 200,
      durationMs: 12,
    })
  })

  it('sends every filter that is set', async () => {
    const fetchMock = ok({ content: [], page: 2, size: 10, total_elements: 0, total_pages: 0 })
    vi.stubGlobal('fetch', fetchMock)

    await fetchAuditLog({
      kind: 'ALL',
      action: 'DOCUMENT_APPROVED',
      user: ' ana ',
      from: new Date('2026-11-01T03:00:00Z'),
      to: new Date('2026-11-08T02:59:59.999Z'),
      page: 2,
      size: 10,
    })

    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      kind: 'ALL',
      action: 'DOCUMENT_APPROVED',
      user: 'ana',
      from: '2026-11-01T03:00:00.000Z',
      to: '2026-11-08T02:59:59.999Z',
      page: '2',
      size: '10',
    })
  })

  it('lists the event actions', async () => {
    const fetchMock = ok(['DOCUMENT_APPROVED', 'TERMS_ACCEPTED'])
    vi.stubGlobal('fetch', fetchMock)

    expect(await fetchAuditActions()).toEqual(['DOCUMENT_APPROVED', 'TERMS_ACCEPTED'])
    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/admin/audit/actions')
  })

  it('reports a failure with the server message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ code: 'forbidden', message: 'Acesso negado.' }),
      }),
    )

    await expect(fetchAuditLog()).rejects.toThrow('Acesso negado.')
  })

  it('names known actions and entities, and keeps unknown ones', () => {
    expect(auditActionLabel('TERMS_ACCEPTED')).toBe('Aceitou os termos')
    expect(auditActionLabel('HTTP_REQUEST')).toBe('Requisição')
    expect(auditActionLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW')
    expect(auditEntityLabel('DOCUMENT')).toBe('Documento')
    expect(auditEntityLabel('OTHER')).toBe('OTHER')
    expect(auditActionLabel('PROFILE_UPDATED')).toBe('Alterou os próprios dados')
    expect(auditActionLabel('PROFILE_CHANGE_REQUESTED')).toBe('Pediu para alterar e-mail ou CPF')
    expect(auditActionLabel('PROFILE_CHANGE_APPROVED')).toBe(
      'Aprovou uma alteração de e-mail ou CPF',
    )
    expect(auditActionLabel('PROFILE_CHANGE_REJECTED')).toBe(
      'Recusou uma alteração de e-mail ou CPF',
    )
    expect(auditActionLabel('USER_UPDATED')).toBe('Alterou os dados de um usuário')
    expect(auditEntityLabel('PROFILE_CHANGE_REQUEST')).toBe('Solicitação de alteração')
  })
})
