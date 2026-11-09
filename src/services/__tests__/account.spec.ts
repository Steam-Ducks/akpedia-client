import { describe, it, expect, vi, afterEach } from 'vitest'
import { deleteMyAccount, fetchAccountStatus } from '../account'

describe('account service', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('deletes the logged-in user’s account', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchMock)

    await deleteMyAccount()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/v1\/me$/)
    expect(init.method).toBe('DELETE')
  })

  it('explains why the last admin cannot leave', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ code: 'last_admin', message: 'Server message.' }),
      }),
    )

    await expect(deleteMyAccount()).rejects.toThrow('Você é o único administrador ativo.')
  })

  it('falls back to the HTTP status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => null }),
    )

    await expect(deleteMyAccount()).rejects.toThrow('(HTTP 500)')
  })

  it('reads the refused CPF from GET /me, null when there is none', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ cpf_problem: 'cpf_taken' }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ cpf_problem: null }) })
    vi.stubGlobal('fetch', fetchMock)

    expect(await fetchAccountStatus()).toEqual({ cpfProblem: 'cpf_taken' })
    expect(await fetchAccountStatus()).toEqual({ cpfProblem: null })
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/v1\/me$/)
  })
})
