import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  fetchBreachNotice,
  fetchBreachNotices,
  fetchBreachNoticeTemplate,
  previewBreachNotice,
  sendBreachNotice,
} from '../breach-notices'

const stubFetch = (body: unknown, ok = true, status = 200) => {
  const fetchMock = vi.fn().mockResolvedValue({ ok, status, json: async () => body })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const draft = {
  subject: 'Assunto',
  body: 'Texto {{data_descoberta}}',
  fields: { data_descoberta: '10/11/2026' },
  recipients: 'all' as const,
}

describe('breach notices service', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the template', async () => {
    const template = {
      subject: 'Assunto',
      body: 'Texto',
      fields: [
        {
          name: 'nome_titular',
          required: true,
          automatic: true,
          description: 'Nome',
          example: 'Ana',
        },
      ],
    }
    const fetchMock = stubFetch(template)

    expect(await fetchBreachNoticeTemplate()).toEqual(template)
    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/admin/breach-notices/template')
  })

  it('previews without recipients or the ANPD confirmation', async () => {
    const fetchMock = stubFetch({ subject: 'Assunto, Ana', body: 'Texto' })

    expect(await previewBreachNotice({ ...draft, recipients: ['kc-1'] })).toEqual({
      subject: 'Assunto, Ana',
      body: 'Texto',
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v1/admin/breach-notices/preview')
    expect(JSON.parse(init.body)).toEqual({
      subject: 'Assunto',
      body: 'Texto {{data_descoberta}}',
      fields: { data_descoberta: '10/11/2026' },
    })
  })

  it('sends to everyone with the ANPD confirmation', async () => {
    const fetchMock = stubFetch({ id: 5, total: 2, sent: 2, failed: 0, failures: [] })

    await sendBreachNotice(draft)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v1/admin/breach-notices')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      subject: 'Assunto',
      body: 'Texto {{data_descoberta}}',
      fields: { data_descoberta: '10/11/2026' },
      all_users: true,
      anpd_informed: true,
    })
  })

  it('sends to the people picked by their Keycloak id and maps the failures', async () => {
    const fetchMock = stubFetch({
      id: 6,
      total: 2,
      sent: 1,
      failed: 1,
      failures: [{ user_id: 11, email: 'b@x.com', reason: 'REJECTED', error: 'REJECTED: 550' }],
    })

    const result = await sendBreachNotice({ ...draft, recipients: ['kc-1', 'kc-2'] })

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(sent.keycloak_ids).toEqual(['kc-1', 'kc-2'])
    expect(sent).not.toHaveProperty('all_users')
    expect(result).toEqual({
      id: 6,
      total: 2,
      sent: 1,
      failed: 1,
      failures: [{ email: 'b@x.com', reason: 'REJECTED', error: 'REJECTED: 550' }],
    })
  })

  it("shows the server's message when it refuses", async () => {
    stubFetch({ code: 'invalid_breach_notice', message: 'Contas sem usuario: kc-9.' }, false, 400)

    await expect(sendBreachNotice(draft)).rejects.toThrow('Contas sem usuario: kc-9.')
  })

  it('lists the notices sent, newest first, a page at a time', async () => {
    const fetchMock = stubFetch({
      content: [
        {
          id: 5,
          subject: 'Aviso',
          sent_by_name: 'Admin',
          anpd_informed: true,
          sent_at: '2026-11-12T10:30:00Z',
          total: 120,
          sent: 119,
          failed: 1,
          pending: 0,
        },
      ],
      page: 1,
      size: 10,
      total_elements: 11,
      total_pages: 2,
    })

    const result = await fetchBreachNotices(1)

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/admin/breach-notices?page=1&size=10')
    expect(result).toEqual({
      content: [
        {
          id: 5,
          subject: 'Aviso',
          sentByName: 'Admin',
          sentAt: new Date('2026-11-12T10:30:00Z'),
          total: 120,
          sent: 119,
          failed: 1,
          pending: 0,
        },
      ],
      page: 1,
      size: 10,
      totalElements: 11,
      totalPages: 2,
    })
  })

  it('loads a notice with the status of each recipient', async () => {
    const fetchMock = stubFetch({
      id: 5,
      subject: 'Aviso',
      body: 'Texto enviado',
      sent_by_name: 'Admin',
      anpd_informed: true,
      sent_at: '2026-11-12T10:30:00Z',
      total: 2,
      sent: 1,
      failed: 1,
      pending: 0,
      recipients: [
        { user_id: 10, name: 'Ana', email: 'ana@x.com', status: 'SENT', error: null },
        { user_id: 11, name: 'Bruno', email: 'b@x.com', status: 'FAILED', error: 'REJECTED: 550' },
      ],
    })

    const notice = await fetchBreachNotice(5)

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/admin/breach-notices/5')
    expect(notice.body).toBe('Texto enviado')
    expect(notice.recipients).toEqual([
      { name: 'Ana', email: 'ana@x.com', status: 'SENT', error: null },
      { name: 'Bruno', email: 'b@x.com', status: 'FAILED', error: 'REJECTED: 550' },
    ])
  })

  it("shows the server's message when a notice can't be loaded", async () => {
    stubFetch({ code: 'not_found', message: 'Aviso não encontrado.' }, false, 404)

    await expect(fetchBreachNotice(9)).rejects.toThrow('Aviso não encontrado.')
  })
})
