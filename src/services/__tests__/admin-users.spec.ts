import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  adminUserErrorMessage,
  createUser,
  fetchAdminUsers,
  adminProfileOf,
  toAdminUser,
  updateUserProfile,
  fetchRoles,
  updateUserRoles,
  updateUserStatus,
} from '../admin-users'

const userDto = {
  id: 'kc-1',
  name: 'Ana Souza',
  email: 'ana@akpedia.local',
  sector: 'Setor 1',
  cpf: '12345678901',
  enabled: true,
  roles: ['STANDARD', 'APPROVER'],
  terms_accepted_version: '2.0',
  current_terms_version: '3.0',
  created_at: '2026-11-01T10:00:00Z',
}

const ok = (body: unknown) => vi.fn().mockResolvedValue({ ok: true, json: async () => body })

const failing = (status: number, code: string) =>
  vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ code, message: 'Mensagem do servidor.' }),
  })

describe('admin users service', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('asks for a page of users and maps them', async () => {
    const fetchMock = ok({
      content: [userDto],
      page: 1,
      size: 20,
      total_elements: 21,
      total_pages: 2,
    })
    vi.stubGlobal('fetch', fetchMock)

    const page = await fetchAdminUsers({ search: ' ana ', page: 1, size: 20 })

    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost')
    expect(url.pathname).toBe('/api/v1/admin/users')
    expect(Object.fromEntries(url.searchParams)).toEqual({ search: 'ana', page: '1', size: '20' })
    expect(page).toMatchObject({ page: 1, size: 20, totalElements: 21, totalPages: 2 })
    expect(page.content[0]).toEqual({
      id: 'kc-1',
      name: 'Ana Souza',
      email: 'ana@akpedia.local',
      sector: 'Setor 1',
      cpf: '12345678901',
      firstName: 'Ana',
      lastName: 'Souza',
      enabled: true,
      roles: ['STANDARD', 'APPROVER'],
      termsAcceptedVersion: '2.0',
      currentTermsVersion: '3.0',
      createdAt: new Date('2026-11-01T10:00:00Z'),
    })
  })

  it('leaves out an empty search', async () => {
    const fetchMock = ok({ content: [], page: 0, size: 20, total_elements: 0, total_pages: 0 })
    vi.stubGlobal('fetch', fetchMock)

    await fetchAdminUsers({ search: '  ' })

    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost')
    expect(url.searchParams.has('search')).toBe(false)
    expect(url.searchParams.get('page')).toBe('0')
  })

  it('maps the roles catalog', async () => {
    vi.stubGlobal(
      'fetch',
      ok([
        {
          name: 'STANDARD',
          label: 'Padrão',
          description: 'Todos os usuários.',
          assignable: false,
          permissions: ['Consultar e buscar documentos'],
        },
        { name: 'ADMIN', label: 'Administrador', assignable: true, permissions: [] },
      ]),
    )

    const roles = await fetchRoles()

    expect(roles[0]).toEqual({
      name: 'STANDARD',
      label: 'Padrão',
      description: 'Todos os usuários.',
      assignable: false,
      permissions: ['Consultar e buscar documentos'],
    })
    expect(roles[1].description).toBeNull()
  })

  it('puts the assignable roles of a user', async () => {
    const fetchMock = ok({ ...userDto, roles: ['STANDARD', 'ADMIN'] })
    vi.stubGlobal('fetch', fetchMock)

    const user = await updateUserRoles('kc-1', ['ADMIN'])

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v1/admin/users/kc-1/roles')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual({ roles: ['ADMIN'] })
    expect(user.roles).toEqual(['STANDARD', 'ADMIN'])
  })

  it('puts the status of a user', async () => {
    const fetchMock = ok({ ...userDto, enabled: false })
    vi.stubGlobal('fetch', fetchMock)

    const user = await updateUserStatus('kc-1', false)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v1/admin/users/kc-1/status')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual({ enabled: false })
    expect(user.enabled).toBe(false)
  })

  it.each([
    [409, 'cannot_change_own_admin', 'Você não pode remover o seu próprio papel de administrador.'],
    [409, 'cannot_disable_self', 'Você não pode desativar a sua própria conta.'],
    [400, 'invalid_role', 'Papel inválido'],
    [404, 'user_not_found', 'Usuário não encontrado'],
    [502, 'keycloak_unavailable', 'Não foi possível falar com o Keycloak'],
  ])('explains a %i %s in Portuguese', async (status, code, message) => {
    vi.stubGlobal('fetch', failing(status, code))

    await expect(updateUserRoles('kc-1', [])).rejects.toThrow(message)
  })

  it("falls back to the server's message for other codes", async () => {
    vi.stubGlobal('fetch', failing(500, 'internal_error'))

    await expect(updateUserStatus('kc-1', true)).rejects.toThrow('Mensagem do servidor.')
    expect(adminUserErrorMessage('internal_error')).toBeNull()
  })

  describe('createUser', () => {
    const newUser = {
      firstName: ' Carla ',
      lastName: 'Dias',
      email: 'carla@akpedia.local ',
      password: 'segredo 123',
      cpf: '123.456.789-01',
      sector: 'Setor 2',
      roles: ['APPROVER'],
    }

    it('posts the new user in snake_case, trimmed, with the CPF digits only', async () => {
      const fetchMock = ok({ ...userDto, roles: ['STANDARD', 'APPROVER'] })
      vi.stubGlobal('fetch', fetchMock)

      const user = await createUser(newUser)

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toMatch(/\/api\/v1\/admin\/users$/)
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body)).toEqual({
        first_name: 'Carla',
        last_name: 'Dias',
        email: 'carla@akpedia.local',
        password: 'segredo 123',
        cpf: '12345678901',
        sector: 'Setor 2',
        roles: ['APPROVER'],
      })
      expect(user.roles).toEqual(['STANDARD', 'APPROVER'])
    })

    it('says when the e-mail is taken', async () => {
      vi.stubGlobal('fetch', failing(409, 'user_exists'))

      await expect(createUser(newUser)).rejects.toThrow('Já existe uma conta com este e-mail.')
    })

    it('shows the server’s message for invalid data, which names the field', async () => {
      vi.stubGlobal('fetch', failing(400, 'invalid_user'))

      await expect(createUser(newUser)).rejects.toThrow('Mensagem do servidor.')
    })

    it('has a message of its own for invalid data without one', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          json: async () => ({ code: 'invalid_user' }),
        }),
      )

      await expect(createUser(newUser)).rejects.toThrow('Dados inválidos')
    })
  })

  describe("editing a user's data", () => {
    it('takes the first and last name from the server, when it sends them', () => {
      const user = toAdminUser({
        ...userDto,
        name: 'Ana Maria Souza',
        first_name: 'Ana Maria',
        last_name: 'Souza',
      })

      expect(user).toMatchObject({ firstName: 'Ana Maria', lastName: 'Souza' })
    })

    it('splits the full name at the first word otherwise', () => {
      expect(toAdminUser({ ...userDto, name: 'Ana Maria Souza' })).toMatchObject({
        firstName: 'Ana',
        lastName: 'Maria Souza',
      })
      expect(toAdminUser({ ...userDto, name: '', cpf: undefined })).toMatchObject({
        firstName: '',
        lastName: '',
        cpf: null,
      })
    })

    it('starts the edit form from the list item, CPF formatted', () => {
      expect(adminProfileOf(toAdminUser(userDto))).toEqual({
        firstName: 'Ana',
        lastName: 'Souza',
        email: 'ana@akpedia.local',
        cpf: '123.456.789-01',
        sector: 'Setor 1',
      })
    })

    it('saves the data, trimmed, with the CPF as digits', async () => {
      const fetchMock = ok({ ...userDto, email: 'ana.souza@akpedia.local' })
      vi.stubGlobal('fetch', fetchMock)

      const user = await updateUserProfile('kc-1', {
        firstName: ' Ana ',
        lastName: 'Souza',
        email: ' ana.souza@akpedia.local ',
        cpf: '123.456.789-01',
        sector: 'Setor 2',
      })

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toMatch(/\/api\/v1\/admin\/users\/kc-1\/profile$/)
      expect(init.method).toBe('PUT')
      expect(JSON.parse(init.body)).toEqual({
        first_name: 'Ana',
        last_name: 'Souza',
        email: 'ana.souza@akpedia.local',
        cpf: '12345678901',
        sector: 'Setor 2',
      })
      expect(user.email).toBe('ana.souza@akpedia.local')
    })

    it.each([
      ['nothing_changed', 409, 'Nada mudou'],
      ['user_exists', 409, 'Já existe uma conta com este e-mail.'],
      ['invalid_profile', 400, 'Mensagem do servidor.'],
    ])('explains %s', async (code, status, message) => {
      vi.stubGlobal('fetch', failing(status, code))

      await expect(
        updateUserProfile('kc-1', {
          firstName: 'Ana',
          lastName: 'Souza',
          email: 'ana@akpedia.local',
          cpf: '12345678901',
          sector: 'Setor 1',
        }),
      ).rejects.toThrow(message)
    })
  })
})
