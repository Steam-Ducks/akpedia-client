import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AdminAuditPage from '../admin/audit.vue'
import { fetchAuditActions, fetchAuditLog } from '@/services/audit'
import type { AuditEntry } from '@/types/Audit'

vi.mock('@/services/audit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/audit')>()),
  fetchAuditLog: vi.fn(),
  fetchAuditActions: vi.fn(),
}))

const entry = (overrides: Partial<AuditEntry> = {}): AuditEntry => ({
  id: 1,
  createdAt: new Date(2026, 10, 7, 14, 3, 21),
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
  ...overrides,
})

const pageOf = (entries: AuditEntry[], totalPages = 1) => ({
  content: entries,
  page: 0,
  size: 50,
  totalElements: entries.length,
  totalPages,
})

const mountPage = async () => {
  const wrapper = mount(AdminAuditPage)
  await flushPromises()
  return wrapper
}

const lastFilters = () => vi.mocked(fetchAuditLog).mock.lastCall?.[0]

describe('admin audit page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchAuditActions).mockResolvedValue(['DOCUMENT_APPROVED', 'TERMS_ACCEPTED'])
    vi.mocked(fetchAuditLog).mockResolvedValue(pageOf([entry()]))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with the events, first page', async () => {
    await mountPage()

    expect(lastFilters()).toEqual({
      kind: 'EVENT',
      action: undefined,
      user: '',
      from: null,
      to: null,
      page: 0,
      size: 50,
    })
  })

  it('shows an event with readable names', async () => {
    const text = (await mountPage()).get('.audit-row').text()

    expect(text).toContain('07/11/2026')
    expect(text).toContain('14:03:21')
    expect(text).toContain('Ana Souza')
    expect(text).toContain('ana@akpedia.local')
    expect(text).toContain('Aceitou os termos')
    expect(text).toContain('Termos #3')
    expect(text).toContain('version: 3')
    expect(text).toContain('10.0.0.1')
    expect(text).toContain('POST')
    expect(text).toContain('/api/v1/terms/accept')
    expect(text).toContain('200')
    expect(text).toContain('12 ms')
  })

  it('shows an anonymous request and a user changed by e-mail', async () => {
    vi.mocked(fetchAuditLog).mockResolvedValue(
      pageOf([
        entry({
          id: 2,
          action: 'HTTP_REQUEST',
          userEmail: null,
          userName: null,
          entityType: null,
          entityId: null,
          details: null,
          httpMethod: 'GET',
          path: '/api/v1/documents',
          statusCode: 401,
        }),
        entry({
          id: 3,
          action: 'USER_ROLES_CHANGED',
          entityType: 'USER',
          entityId: null,
          details: { target_email: 'bruno@akpedia.local', before: ['STANDARD'], after: [] },
        }),
      ]),
    )

    const [request, roles] = (await mountPage()).findAll('.audit-row').map((row) => row.text())

    expect(request).toContain('Anônimo')
    expect(request).toContain('Requisição')
    expect(request).toContain('401')
    expect(roles).toContain('Alterou os papéis de um usuário')
    expect(roles).toContain('Usuário bruno@akpedia.local')
    expect(roles).toContain('before: STANDARD')
    expect(roles).toContain('after: (nenhum)')
  })

  it('shows the pseudonym of a deleted user', async () => {
    vi.mocked(fetchAuditLog).mockResolvedValue(
      pageOf([
        entry({
          userEmail: null,
          userName: null,
          userPseudonym: 'Usuário removido #12',
          ipAddress: null,
          userAgent: null,
        }),
      ]),
    )

    const row = (await mountPage()).get('.audit-row')

    expect(row.get('.user-pseudonym').text()).toBe('Usuário removido #12')
    expect(row.text()).not.toContain('Anônimo')
  })

  it('offers the logged actions with readable names', async () => {
    const options = (await mountPage()).findAll('.filter-action option').map((o) => o.text())

    expect(options).toEqual(['Todas', 'Aprovou um documento', 'Aceitou os termos'])
  })

  it('sends the filters, converting the dates to whole local days', async () => {
    vi.useFakeTimers()
    const wrapper = await mountPage()

    await wrapper.get('.filter-kind select').setValue('ALL')
    await wrapper.get('.filter-action select').setValue('DOCUMENT_APPROVED')
    await wrapper.get('.filter-user input').setValue('ana')
    await wrapper.get('.filter-from input').setValue('2026-11-01')
    await wrapper.get('.filter-to input').setValue('2026-11-07')
    await vi.advanceTimersByTimeAsync(300)

    expect(fetchAuditLog).toHaveBeenCalledTimes(2)
    expect(lastFilters()).toEqual({
      kind: 'ALL',
      action: 'DOCUMENT_APPROVED',
      user: 'ana',
      from: new Date(2026, 10, 1),
      to: new Date(2026, 10, 7, 23, 59, 59, 999),
      page: 0,
      size: 50,
    })
  })

  it('drops the action filter for plain requests', async () => {
    vi.useFakeTimers()
    const wrapper = await mountPage()

    await wrapper.get('.filter-action select').setValue('TERMS_ACCEPTED')
    await wrapper.get('.filter-kind select').setValue('REQUEST')
    await vi.advanceTimersByTimeAsync(300)

    expect(lastFilters()).toMatchObject({ kind: 'REQUEST', action: undefined })
  })

  it('pages through the log with the same filters', async () => {
    vi.mocked(fetchAuditLog).mockResolvedValue(pageOf([entry()], 4))
    const wrapper = await mountPage()

    await wrapper.findAll('.ak-paginator button')[1].trigger('click')
    await flushPromises()

    expect(lastFilters()).toMatchObject({ kind: 'EVENT', page: 1 })
  })

  it('reports a failed load', async () => {
    vi.mocked(fetchAuditLog).mockRejectedValue(new Error('Acesso negado.'))

    expect((await mountPage()).text()).toContain('Acesso negado.')
  })
})
