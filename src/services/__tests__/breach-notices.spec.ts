import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchBreachNoticeTemplate, previewBreachNotice, sendBreachNotice } from '../breach-notices'

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
})
