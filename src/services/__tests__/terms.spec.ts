import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  acceptTerms,
  declineTerms,
  fetchTerms,
  fetchTermsHistory,
  fetchTermsHistoryEntry,
  publishTerms,
  nextTermsVersion,
  TermsChangedError,
  TermsVersionExistsError,
} from '../terms'

const versionDto = {
  version: '3.0',
  title: 'Termos de uso',
  content: 'Primeiro parágrafo.\n\nSegundo parágrafo.',
  published_at: '2026-11-06T12:00:00Z',
  published_by: 'Admin Akpedia',
}

describe('terms service', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps the current terms and the last acceptance', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          current: versionDto,
          accepted: { version: '2.0', accepted_at: '2026-11-01T10:00:00Z' },
        }),
      }),
    )

    const terms = await fetchTerms()

    expect(terms.current).toMatchObject({ version: '3.0', publishedBy: 'Admin Akpedia' })
    expect(terms.current?.publishedAt).toEqual(new Date('2026-11-06T12:00:00Z'))
    expect(terms.accepted).toEqual({ version: '2.0', acceptedAt: new Date('2026-11-01T10:00:00Z') })
  })

  it('keeps null when no terms were published', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ current: null, accepted: null }) }),
    )

    expect(await fetchTerms()).toEqual({ current: null, accepted: null })
  })

  it('accepts the version that was shown', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ version: '3.0', accepted_at: '2026-11-06T13:00:00Z' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await acceptTerms('3.0')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v1/terms/accept')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ version: '3.0', optional_permissions: {} })
  })

  it('tells a 409 terms_changed apart from other failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ code: 'terms_changed', message: 'A versão atual é a 4.' }),
      }),
    )

    await expect(acceptTerms('3.0')).rejects.toBeInstanceOf(TermsChangedError)
  })

  it('publishes the title and the plain text; the server numbers it', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => versionDto })
    vi.stubGlobal('fetch', fetchMock)

    const published = await publishTerms({
      title: 'Termos de uso',
      content: 'Texto.',
      optionalPermissions: [],
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v1/admin/terms')
    expect(JSON.parse(init.body)).toEqual({
      title: 'Termos de uso',
      content: 'Texto.',
      optional_permissions: [],
    })
    expect(published.version).toBe('3.0')
  })

  it('tells a 409 terms_version_exists apart, with the server’s message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({
          code: 'terms_version_exists',
          message: 'Já existe a versão 1.0. Recarregue a página e publique de novo.',
        }),
      }),
    )

    const publishing = publishTerms({ title: 'Termos', content: 'Texto.', optionalPermissions: [] })

    await expect(publishing).rejects.toBeInstanceOf(TermsVersionExistsError)
    await expect(publishing).rejects.toThrow('Já existe a versão 1.0.')
  })

  it('numbers the next version as the next X.0, as the server does', () => {
    expect(nextTermsVersion([])).toBe('1.0')
    expect(nextTermsVersion(['2.0', '1.0'])).toBe('3.0')
    // As numbers, not text: 10.0 after 9.0; an older X.Y counts by its X.
    expect(nextTermsVersion(['9.0'])).toBe('10.0')
    expect(nextTermsVersion(['1.3', '1.0'])).toBe('2.0')
    // Labels from before the numbering are skipped, wherever they are in the list.
    expect(nextTermsVersion(['OI', '4.0', '2026.1-rc_2', '1.'])).toBe('5.0')
    expect(nextTermsVersion(['OI'])).toBe('1.0')
  })

  it('declines the version that was shown', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchMock)

    await declineTerms('3.0')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v1/terms/decline')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ version: '3.0' })
  })

  it('reports a failed refusal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => null }),
    )

    await expect(declineTerms('3.0')).rejects.toThrow('HTTP 500')
  })

  it('shows the server’s message for a refused refusal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ code: 'terms_changed', message: 'Os termos mudaram.' }),
      }),
    )

    await expect(declineTerms('3.0')).rejects.toThrow('Os termos mudaram.')
  })

  it('asks for a page of the history with only the filters that are set', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          {
            id: 7,
            action: 'updated',
            version: '2.0',
            user_id: 3,
            user_name: 'Ana Souza',
            user_email: 'ana@akaer.com',
            at: '2026-11-01T10:00:00Z',
          },
        ],
        page: 1,
        size: 20,
        total_elements: 21,
        total_pages: 2,
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const page = await fetchTermsHistory({ version: '2.0', user: ' ana ', page: 1 })

    const [url] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v1/admin/terms/history?page=1&size=20&version=2.0&user=ana')
    expect(page.totalPages).toBe(2)
    expect(page.content[0]).toEqual({
      action: 'updated',
      id: 7,
      version: '2.0',
      userId: 3,
      userName: 'Ana Souza',
      userEmail: 'ana@akaer.com',
      at: new Date('2026-11-01T10:00:00Z'),
    })

    await fetchTermsHistory()
    expect(fetchMock.mock.calls[1][0]).toMatch(/history\?page=0&size=20$/)
  })

  it('loads one entry of the history with its permissions', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        action: 'accepted',
        id: 7,
        version: '2.0',
        user_name: 'Ana Souza',
        user_email: 'ana@akaer.com',
        at: '2026-11-01T10:00:00Z',
        permissions: [
          {
            id: 'newsletter',
            label: 'Newsletter',
            description: 'E-mails',
            granted_before: null,
            granted_after: true,
            changed: false,
          },
        ],
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const detail = await fetchTermsHistoryEntry('accepted', 7)

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/admin/terms/history/accepted/7')
    expect(detail.at).toEqual(new Date('2026-11-01T10:00:00Z'))
    expect(detail.permissions[0]).toEqual({
      id: 'newsletter',
      label: 'Newsletter',
      description: 'E-mails',
      grantedBefore: null,
      grantedAfter: true,
      changed: false,
    })
  })

  it('reports a failed load of the history', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    )

    await expect(fetchTermsHistory()).rejects.toThrow(
      'Não foi possível carregar o histórico dos termos (HTTP 500).',
    )
  })
})
