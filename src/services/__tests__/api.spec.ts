import { describe, it, expect, vi, afterEach } from 'vitest'
import { apiFetch } from '../api'
import { accessToken, loginAgain } from '../auth'

vi.mock('../auth', () => ({
  accessToken: vi.fn(),
  loginAgain: vi.fn(),
}))

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('sends the access token, keeping the other headers', async () => {
    vi.mocked(accessToken).mockResolvedValue('abc.def.ghi')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/api/v1/categories', { headers: { 'Content-Type': 'application/json' } })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v1/categories')
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer abc.def.ghi',
    })
  })

  it('sends no Authorization header when nobody is logged in', async () => {
    vi.mocked(accessToken).mockResolvedValue(null)
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/api/v1/categories')

    expect(fetchMock.mock.calls[0][1].headers).toEqual({})
  })

  it('goes back to the login page when the server turns the token down', async () => {
    vi.mocked(accessToken).mockResolvedValue('expired')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))

    await apiFetch('/api/v1/documents')

    expect(loginAgain).toHaveBeenCalled()
  })

  it('does not log in again on other errors', async () => {
    vi.mocked(accessToken).mockResolvedValue('abc')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }))

    await apiFetch('/api/v1/documents/pending')

    expect(loginAgain).not.toHaveBeenCalled()
  })
})
