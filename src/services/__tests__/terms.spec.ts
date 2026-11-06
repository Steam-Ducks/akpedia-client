import { describe, it, expect, vi, afterEach } from 'vitest'
import { acceptTerms, fetchTerms, publishTerms, TermsChangedError } from '../terms'

const versionDto = {
  version: 3,
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
          accepted: { version: 2, accepted_at: '2026-11-01T10:00:00Z' },
        }),
      }),
    )

    const terms = await fetchTerms()

    expect(terms.current).toMatchObject({ version: 3, publishedBy: 'Admin Akpedia' })
    expect(terms.current?.publishedAt).toEqual(new Date('2026-11-06T12:00:00Z'))
    expect(terms.accepted).toEqual({ version: 2, acceptedAt: new Date('2026-11-01T10:00:00Z') })
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
      json: async () => ({ version: 3, accepted_at: '2026-11-06T13:00:00Z' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await acceptTerms(3)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v1/terms/accept')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ version: 3 })
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

    await expect(acceptTerms(3)).rejects.toBeInstanceOf(TermsChangedError)
  })

  it('publishes the title and the plain text', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => versionDto })
    vi.stubGlobal('fetch', fetchMock)

    const published = await publishTerms({ title: 'Termos de uso', content: 'Texto.' })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v1/admin/terms')
    expect(JSON.parse(init.body)).toEqual({ title: 'Termos de uso', content: 'Texto.' })
    expect(published.version).toBe(3)
  })
})
