import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  cancelChangeRequest,
  createChangeRequest,
  fetchMyChangeRequests,
  fetchMyProfile,
  profileErrorMessage,
  updateMyProfile,
} from '../profile'
import { formatCpf } from '@/utils/cpf'

const profileDto = {
  first_name: 'Ana',
  last_name: 'Souza',
  email: 'ana@akpedia.local',
  cpf: '12345678901',
  sector: 'Setor 3',
  roles: ['STANDARD'],
  editable: ['first_name', 'last_name', 'sector'],
  requestable: ['email', 'cpf'],
}

const requestDto = {
  id: 7,
  field: 'email',
  new_value: 'ana.souza@akpedia.local',
  reason: 'Casei',
  status: 'REJECTED',
  created_at: '2026-11-01T10:00:00Z',
  decided_at: '2026-11-02T10:00:00Z',
  decision_note: 'Use o e-mail do setor.',
  decided_by_name: 'Admin Akpedia',
}

const ok = (body: unknown) => vi.fn().mockResolvedValue({ ok: true, json: async () => body })

const failing = (status: number, code: string, message = 'Mensagem do servidor.') =>
  vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({ code, message }) })

const bodyOf = (fetchMock: ReturnType<typeof vi.fn>) =>
  JSON.parse(fetchMock.mock.calls[0][1].body as string)

describe('profile service', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the profile and maps it', async () => {
    const fetchMock = ok(profileDto)
    vi.stubGlobal('fetch', fetchMock)

    const profile = await fetchMyProfile()

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/me/profile')
    expect(profile).toEqual({
      firstName: 'Ana',
      lastName: 'Souza',
      email: 'ana@akpedia.local',
      cpf: '12345678901',
      sector: 'Setor 3',
      roles: ['STANDARD'],
      editable: ['first_name', 'last_name', 'sector'],
      requestable: ['email', 'cpf'],
    })
  })

  it('saves the name and sector, trimmed', async () => {
    const fetchMock = ok({ ...profileDto, first_name: 'Ana Maria' })
    vi.stubGlobal('fetch', fetchMock)

    const profile = await updateMyProfile({
      firstName: ' Ana Maria ',
      lastName: 'Souza ',
      sector: 'Setor 3',
    })

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/me/profile')
    expect(fetchMock.mock.calls[0][1].method).toBe('PUT')
    expect(bodyOf(fetchMock)).toEqual({
      first_name: 'Ana Maria',
      last_name: 'Souza',
      sector: 'Setor 3',
    })
    expect(profile.firstName).toBe('Ana Maria')
  })

  it("shows the server's message for invalid_profile, which names the field", async () => {
    vi.stubGlobal('fetch', failing(400, 'invalid_profile', 'O nome é obrigatório.'))

    await expect(
      updateMyProfile({ firstName: '', lastName: 'Souza', sector: 'Setor 1' }),
    ).rejects.toThrow('O nome é obrigatório.')
  })

  it('says when nothing changed', async () => {
    vi.stubGlobal('fetch', failing(400, 'nothing_changed'))

    await expect(
      updateMyProfile({ firstName: 'Ana', lastName: 'Souza', sector: 'Setor 3' }),
    ).rejects.toThrow('Nada mudou')
  })

  it('lists the own requests and maps them', async () => {
    vi.stubGlobal('fetch', ok([requestDto]))

    const [request] = await fetchMyChangeRequests()

    expect(request).toEqual({
      id: 7,
      field: 'email',
      newValue: 'ana.souza@akpedia.local',
      reason: 'Casei',
      status: 'REJECTED',
      createdAt: new Date('2026-11-01T10:00:00Z'),
      decidedAt: new Date('2026-11-02T10:00:00Z'),
      decisionNote: 'Use o e-mail do setor.',
      decidedByName: 'Admin Akpedia',
      user: null,
    })
  })

  it('asks for a CPF change with digits only, and no empty reason', async () => {
    const fetchMock = ok({ ...requestDto, field: 'cpf', status: 'PENDING' })
    vi.stubGlobal('fetch', fetchMock)

    await createChangeRequest({ field: 'cpf', newValue: ' 123.456.789-01 ', reason: '  ' })

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/me/profile/requests')
    expect(fetchMock.mock.calls[0][1].method).toBe('POST')
    expect(bodyOf(fetchMock)).toEqual({ field: 'cpf', new_value: '12345678901', reason: null })
  })

  it('asks for an e-mail change with the reason', async () => {
    const fetchMock = ok({ ...requestDto, status: 'PENDING' })
    vi.stubGlobal('fetch', fetchMock)

    await createChangeRequest({ field: 'email', newValue: 'novo@akpedia.local', reason: ' Casei ' })

    expect(bodyOf(fetchMock)).toEqual({
      field: 'email',
      new_value: 'novo@akpedia.local',
      reason: 'Casei',
    })
  })

  it.each([
    ['change_request_pending', 'já tem uma solicitação pendente'],
    ['user_exists', 'Já existe uma conta com este e-mail.'],
  ])('explains %s', async (code, message) => {
    vi.stubGlobal('fetch', failing(409, code))

    await expect(
      createChangeRequest({ field: 'email', newValue: 'novo@akpedia.local' }),
    ).rejects.toThrow(message)
  })

  it('cancels a request with DELETE', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchMock)

    await cancelChangeRequest(7)

    expect(fetchMock.mock.calls[0][0]).toContain('/api/v1/me/profile/requests/7')
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
  })

  it('says when the request to cancel is gone', async () => {
    vi.stubGlobal('fetch', failing(404, 'change_request_not_found'))

    await expect(cancelChangeRequest(7)).rejects.toThrow('Solicitação não encontrada')
  })

  it('falls back to the HTTP status for unknown errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => null }),
    )

    await expect(fetchMyProfile()).rejects.toThrow('(HTTP 500)')
    expect(profileErrorMessage('whatever')).toBeNull()
  })
})

describe('formatCpf', () => {
  it('punctuates 11 digits and leaves anything else alone', () => {
    expect(formatCpf('12345678901')).toBe('123.456.789-01')
    expect(formatCpf('123.456.789-01')).toBe('123.456.789-01')
    expect(formatCpf('123')).toBe('123')
    expect(formatCpf(null)).toBe('')
  })
})
