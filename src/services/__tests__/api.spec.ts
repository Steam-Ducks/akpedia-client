import { describe, it, expect, vi, afterEach } from 'vitest'
import { apiFetch, onCpfRefused, onTermsPending } from '../api'
import { accessToken, loginAgain } from '../auth'

vi.mock('../auth', () => ({
  accessToken: vi.fn(),
  loginAgain: vi.fn(),
}))

describe('apiFetch', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    onTermsPending(null)
    onCpfRefused(null)
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

  const forbidden = (body: unknown) => {
    const response = {
      ok: false,
      status: 403,
      json: async () => body,
      clone: () => ({ json: async () => body }),
    }
    return response
  }

  it('reports terms not accepted, leaving the body readable to the caller', async () => {
    vi.mocked(accessToken).mockResolvedValue('abc')
    const body = { code: 'terms_pending', message: 'Aceite os termos de uso.' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(forbidden(body)))
    const callback = vi.fn()
    onTermsPending(callback)

    const response = await apiFetch('/api/v1/documents')

    expect(callback).toHaveBeenCalledOnce()
    expect(await response.json()).toEqual(body)
  })

  it('does not report terms on any other 403', async () => {
    vi.mocked(accessToken).mockResolvedValue('abc')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(forbidden({ code: 'forbidden' })))
    const callback = vi.fn()
    onTermsPending(callback)

    await apiFetch('/api/v1/documents/pending')

    expect(callback).not.toHaveBeenCalled()
  })

  const unprocessable = (body: unknown) => ({
    ok: false,
    status: 422,
    json: async () => body,
    clone: () => ({ json: async () => body }),
  })

  it('reports a refused CPF with its code, leaving the body readable to the caller', async () => {
    vi.mocked(accessToken).mockResolvedValue('abc')
    const body = { code: 'cpf_taken', message: 'O CPF da sua conta já pertence a outro usuário.' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(unprocessable(body)))
    const callback = vi.fn()
    onCpfRefused(callback)

    const response = await apiFetch('/api/v1/documents')

    expect(callback).toHaveBeenCalledWith('cpf_taken')
    expect(await response.json()).toEqual(body)
  })

  it('does not report the CPF on any other 422', async () => {
    vi.mocked(accessToken).mockResolvedValue('abc')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(unprocessable({ code: 'pdf_conversion_rejected' })),
    )
    const callback = vi.fn()
    onCpfRefused(callback)

    await apiFetch('/api/v1/documents')

    expect(callback).not.toHaveBeenCalled()
  })
})
