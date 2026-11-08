import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  acceptTerms,
  declineTerms,
  fetchTerms,
  publishTerms,
  sameTermsVersion,
  TERMS_VERSION_PATTERN,
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
    expect(JSON.parse(init.body)).toEqual({ version: '3.0' })
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

  it('publishes the typed version, the title and the plain text', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => versionDto })
    vi.stubGlobal('fetch', fetchMock)

    const published = await publishTerms({
      version: '3.0',
      title: 'Termos de uso',
      content: 'Texto.',
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v1/admin/terms')
    expect(JSON.parse(init.body)).toEqual({
      version: '3.0',
      title: 'Termos de uso',
      content: 'Texto.',
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
          message: 'Já existe a versão 1.0. Use um número de versão novo.',
        }),
      }),
    )

    const publishing = publishTerms({ version: '1.0', title: 'Termos', content: 'Texto.' })

    await expect(publishing).rejects.toBeInstanceOf(TermsVersionExistsError)
    await expect(publishing).rejects.toThrow('Já existe a versão 1.0.')
  })

  it('takes the versions the server takes, and tells them apart ignoring case and spaces', () => {
    for (const ok of ['1', '1.0', '2026.1', 'v2-rc_1', 'x'.repeat(20)]) {
      expect(TERMS_VERSION_PATTERN.test(ok)).toBe(true)
    }
    for (const bad of ['', '1 0', '1,0', 'versão', '1.0!', 'x'.repeat(21)]) {
      expect(TERMS_VERSION_PATTERN.test(bad)).toBe(false)
    }
    expect(sameTermsVersion(' V1.0 ', 'v1.0')).toBe(true)
    expect(sameTermsVersion('1.0', '1.0.1')).toBe(false)
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
})
