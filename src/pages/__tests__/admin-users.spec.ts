import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import AdminUsersPage from '../admin/users.vue'
import {
  createUser,
  fetchAdminUsers,
  fetchRoles,
  updateUserProfile,
  updateUserRoles,
  updateUserStatus,
} from '@/services/admin-users'
import {
  approveProfileRequest,
  fetchProfileRequests,
  rejectProfileRequest,
} from '@/services/admin-profile-requests'
import type { ChangeRequest } from '@/types/Profile'
import type { SessionUser } from '@/services/auth'
import type { AdminUser, Role } from '@/types/AdminUser'

const session = ref<SessionUser | null>(null)

import { confirmAction } from '@/utils/confirm'

vi.mock('@/utils/confirm', () => ({ confirmAction: vi.fn() }))
vi.mock('@/services/auth', () => ({
  get sessionUser() {
    return session
  },
}))

vi.mock('@/services/admin-users', () => ({
  createUser: vi.fn(),
  fetchAdminUsers: vi.fn(),
  fetchRoles: vi.fn(),
  adminProfileOf: (user: AdminUser) => ({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    cpf: user.cpf ?? '',
    sector: user.sector ?? '',
  }),
  updateUserProfile: vi.fn(),
  updateUserRoles: vi.fn(),
  updateUserStatus: vi.fn(),
}))

vi.mock('@/services/admin-profile-requests', () => ({
  fetchProfileRequests: vi.fn(),
  approveProfileRequest: vi.fn(),
  rejectProfileRequest: vi.fn(),
}))

const pendingRequest = (overrides: Partial<ChangeRequest> = {}): ChangeRequest => ({
  id: 5,
  field: 'email',
  newValue: 'bruno.lima@akpedia.local',
  reason: 'Mudei de setor',
  status: 'PENDING',
  createdAt: new Date('2026-11-01T10:00:00Z'),
  decidedAt: null,
  decisionNote: null,
  decidedByName: null,
  user: { id: 'kc-bruno', name: 'Bruno Lima', email: 'bruno@akpedia.local' },
  ...overrides,
})

const roles: Role[] = [
  {
    name: 'STANDARD',
    label: 'Padrão',
    description: null,
    assignable: false,
    permissions: ['Consultar e buscar documentos', 'Enviar documentos'],
  },
  {
    name: 'APPROVER',
    label: 'Aprovador',
    description: null,
    assignable: true,
    permissions: ['Revisar a fila de pendentes'],
  },
  {
    name: 'ADMIN',
    label: 'Administrador',
    description: null,
    assignable: true,
    permissions: ['Gerenciar usuários e papéis'],
  },
]

const adminUser = (overrides: Partial<AdminUser> = {}): AdminUser => ({
  id: 'kc-ana',
  name: 'Ana Souza',
  email: 'ana@akpedia.local',
  sector: 'Engenharia',
  cpf: '12345678909',
  firstName: 'Ana',
  lastName: 'Souza',
  enabled: true,
  roles: ['STANDARD'],
  termsAcceptedVersion: '3.0',
  currentTermsVersion: '3.0',
  createdAt: null,
  ...overrides,
})

const bruno = adminUser({
  id: 'kc-bruno',
  name: 'Bruno Lima',
  firstName: 'Bruno',
  lastName: 'Lima',
  email: 'bruno@akpedia.local',
  sector: 'Qualidade',
  cpf: '123.456.789-09',
  roles: ['STANDARD', 'APPROVER'],
  termsAcceptedVersion: '2.0',
})
const admin = adminUser({
  id: 'kc-admin',
  name: 'Admin Akpedia',
  email: 'Admin@akpedia.local',
  roles: ['STANDARD', 'ADMIN'],
  termsAcceptedVersion: null,
})

const pageOf = (users: AdminUser[], totalPages = 1) => ({
  content: users,
  page: 0,
  size: 20,
  totalElements: users.length,
  totalPages,
})

const mountPage = async () => {
  const wrapper = mount(AdminUsersPage)
  await flushPromises()
  return wrapper
}

const row = (wrapper: Awaited<ReturnType<typeof mountPage>>, id: string) =>
  wrapper.get(`[data-user-id="${id}"]`)

describe('admin users page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    session.value = {
      name: 'Admin Akpedia',
      email: 'admin@akpedia.local',
      sector: null,
      roles: ['STANDARD', 'ADMIN'],
      canReview: true,
      isAdmin: true,
    }
    vi.mocked(fetchRoles).mockResolvedValue(roles)
    vi.mocked(fetchAdminUsers).mockResolvedValue(pageOf([bruno, admin]))
    vi.mocked(confirmAction).mockResolvedValue(true)
    vi.mocked(fetchProfileRequests).mockResolvedValue({
      content: [],
      page: 0,
      size: 50,
      totalElements: 0,
      totalPages: 0,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('lists the users with roles, terms and status', async () => {
    const wrapper = await mountPage()

    expect(fetchAdminUsers).toHaveBeenCalledWith({
      search: '',
      sector: '',
      role: '',
      page: 0,
      size: 20,
    })
    const brunoRow = row(wrapper, 'kc-bruno').text()
    expect(brunoRow).toContain('Bruno Lima')
    expect(brunoRow).toContain('bruno@akpedia.local')
    expect(brunoRow).toContain('Padrão')
    expect(brunoRow).toContain('Aprovador')
    expect(brunoRow).toContain('Pendente (aceitou a versão 2.0)')
    expect(brunoRow).toContain('Ativo')
    const adminRow = row(wrapper, 'kc-admin').text()
    expect(adminRow).toContain('(você)')
    expect(adminRow).toContain('Pendente')
  })

  it('says when the current terms were accepted and when a user is disabled', async () => {
    vi.mocked(fetchAdminUsers).mockResolvedValue(pageOf([adminUser({ enabled: false })]))

    const text = row(await mountPage(), 'kc-ana').text()

    expect(text).toContain('Aceitou a versão 3.0')
    expect(text).toContain('Desativado')
    expect(text).toContain('Reativar')
  })

  it('lists every role with its permissions', async () => {
    const panel = (await mountPage()).get('.roles-panel').text()

    expect(panel).toContain('Papéis e permissões')
    expect(panel).toContain('Padrão')
    expect(panel).toContain('Enviar documentos')
    expect(panel).toContain('Gerenciar usuários e papéis')
  })

  it('saves the ticked assignable roles', async () => {
    vi.mocked(updateUserRoles).mockResolvedValue({ ...bruno, roles: ['STANDARD', 'ADMIN'] })
    const wrapper = await mountPage()

    await row(wrapper, 'kc-bruno').get('.edit-roles').trigger('click')
    const editor = wrapper.get('.roles-editor')
    expect(editor.find('input[type="checkbox"]:disabled').exists()).toBe(true) // STANDARD
    await editor.get('input[name="APPROVER"]').setValue(false)
    await editor.get('input[name="ADMIN"]').setValue(true)
    await editor.trigger('submit')
    await flushPromises()

    expect(confirmAction).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Alterar os papéis de Bruno Lima?' }),
    )
    expect(updateUserRoles).toHaveBeenCalledWith('kc-bruno', ['ADMIN'])
    expect(row(wrapper, 'kc-bruno').text()).toContain('Administrador')
    expect(wrapper.text()).toContain('próximo login')
  })

  it('keeps the roles when the confirmation is cancelled', async () => {
    vi.mocked(confirmAction).mockResolvedValue(false)
    const wrapper = await mountPage()

    await row(wrapper, 'kc-bruno').get('.edit-roles').trigger('click')
    await wrapper.get('input[name="ADMIN"]').setValue(true)
    await wrapper.get('.roles-editor').trigger('submit')
    await flushPromises()

    expect(updateUserRoles).not.toHaveBeenCalled()
    expect(wrapper.find('.roles-editor').exists()).toBe(true)
  })

  it('filters by sector and by role, from the first page', async () => {
    const wrapper = await mountPage()
    vi.mocked(fetchAdminUsers).mockClear()

    await wrapper.get('.filter-sector select').setValue('Financeiro')
    await flushPromises()
    expect(fetchAdminUsers).toHaveBeenLastCalledWith({
      search: '',
      sector: 'Financeiro',
      role: '',
      page: 0,
      size: 20,
    })

    await wrapper.get('.filter-role select').setValue('APPROVER')
    await flushPromises()
    expect(fetchAdminUsers).toHaveBeenLastCalledWith({
      search: '',
      sector: 'Financeiro',
      role: 'APPROVER',
      page: 0,
      size: 20,
    })
  })

  it("locks one's own admin role and status", async () => {
    const wrapper = await mountPage()

    const ownRow = row(wrapper, 'kc-admin')
    expect(ownRow.get('.toggle-status').attributes('disabled')).toBeDefined()
    expect(row(wrapper, 'kc-bruno').get('.toggle-status').attributes('disabled')).toBeUndefined()

    await ownRow.get('.edit-roles').trigger('click')
    const editor = wrapper.get('.roles-editor')
    expect(editor.get('input[name="ADMIN"]').attributes('disabled')).toBeDefined()
    expect(editor.get('input[name="APPROVER"]').attributes('disabled')).toBeUndefined()
  })

  it('disables a user after confirmation', async () => {
    vi.mocked(confirmAction).mockResolvedValue(true)
    vi.mocked(updateUserStatus).mockResolvedValue({ ...bruno, enabled: false })
    const wrapper = await mountPage()

    await row(wrapper, 'kc-bruno').get('.toggle-status').trigger('click')
    await flushPromises()

    expect(updateUserStatus).toHaveBeenCalledWith('kc-bruno', false)
    expect(row(wrapper, 'kc-bruno').text()).toContain('Desativado')
  })

  it('does nothing when the confirmation is cancelled', async () => {
    vi.mocked(confirmAction).mockResolvedValue(false)
    const wrapper = await mountPage()

    await row(wrapper, 'kc-bruno').get('.toggle-status').trigger('click')

    expect(updateUserStatus).not.toHaveBeenCalled()
  })

  it("shows the service's message when an action fails", async () => {
    vi.mocked(confirmAction).mockResolvedValue(true)
    vi.mocked(updateUserStatus).mockRejectedValue(
      new Error('Não foi possível falar com o Keycloak agora.'),
    )
    const wrapper = await mountPage()

    await row(wrapper, 'kc-bruno').get('.toggle-status').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Não foi possível falar com o Keycloak')
    expect(row(wrapper, 'kc-bruno').text()).toContain('Ativo')
  })

  it('searches after a pause in typing, from the first page', async () => {
    vi.useFakeTimers()
    const wrapper = await mountPage()
    vi.mocked(fetchAdminUsers).mockClear()

    await wrapper.get('.users-search input').setValue('bru')
    expect(fetchAdminUsers).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(300)

    expect(fetchAdminUsers).toHaveBeenCalledTimes(1)
    expect(fetchAdminUsers).toHaveBeenCalledWith({
      search: 'bru',
      sector: '',
      role: '',
      page: 0,
      size: 20,
    })
  })

  it('pages through the users', async () => {
    vi.mocked(fetchAdminUsers).mockResolvedValue(pageOf([bruno], 3))
    const wrapper = await mountPage()

    await wrapper.findAll('.ak-paginator button')[1].trigger('click')
    await flushPromises()

    expect(fetchAdminUsers).toHaveBeenLastCalledWith({
      search: '',
      sector: '',
      role: '',
      page: 1,
      size: 20,
    })
  })

  it('reports a failed load', async () => {
    vi.mocked(fetchAdminUsers).mockRejectedValue(new Error('Sem conexão.'))

    expect((await mountPage()).text()).toContain('Sem conexão.')
  })

  describe('Novo usuário', () => {
    const fill = async (wrapper: Awaited<ReturnType<typeof mountPage>>, cpf = '123.456.789-09') => {
      await wrapper.get('.new-first-name input').setValue('Carla')
      await wrapper.get('.new-last-name input').setValue('Dias')
      await wrapper.get('.new-email input').setValue('carla@akpedia.local')
      await wrapper.get('.new-password input').setValue('segredo')
      await wrapper.get('.new-cpf input').setValue(cpf)
      await wrapper.get('.new-sector select').setValue('Manutenção')
    }

    const openForm = async () => {
      const wrapper = await mountPage()
      expect(wrapper.find('form.create-card').exists()).toBe(false)
      await wrapper.get('.new-user').trigger('click')
      return wrapper
    }

    it('opens a form with the seven sectors and the assignable roles', async () => {
      const wrapper = await openForm()

      const form = wrapper.get('form.create-card')
      const sectors = form.findAll('.new-sector option').map((option) => option.text())
      expect(sectors).toEqual([
        'Escolha o setor',
        'Engenharia',
        'Qualidade',
        'Logística',
        'Manutenção',
        'Recursos Humanos',
        'Financeiro',
        'Jurídico',
      ])
      expect(form.find('input[name="APPROVER"]').exists()).toBe(true)
      expect(form.find('input[name="ADMIN"]').exists()).toBe(true)
      expect(form.get('.create-user').attributes('disabled')).toBeDefined()
    })

    it('waits for every field and a CPF of 11 digits', async () => {
      const wrapper = await openForm()

      await fill(wrapper, '123')
      expect(wrapper.text()).toContain('O CPF deve ter 11 dígitos.')
      expect(wrapper.get('.create-user').attributes('disabled')).toBeDefined()

      await wrapper.get('.new-cpf input').setValue('12345678901')
      expect(wrapper.text()).toContain('CPF inválido: confira os dígitos.')
      expect(wrapper.get('.create-user').attributes('disabled')).toBeDefined()

      await wrapper.get('.new-cpf input').setValue('12345678909')
      expect(wrapper.get('.create-user').attributes('disabled')).toBeUndefined()
    })

    it('creates the user, says so and reloads the list', async () => {
      vi.mocked(createUser).mockResolvedValue(
        adminUser({ id: 'kc-carla', name: 'Carla Dias', email: 'carla@akpedia.local' }),
      )
      const wrapper = await openForm()

      await fill(wrapper)
      await wrapper.get('input[name="APPROVER"]').setValue(true)
      await wrapper.get('form.create-card').trigger('submit')
      await flushPromises()

      expect(createUser).toHaveBeenCalledWith({
        firstName: 'Carla',
        lastName: 'Dias',
        email: 'carla@akpedia.local',
        password: 'segredo',
        cpf: '123.456.789-09',
        sector: 'Manutenção',
        roles: ['APPROVER'],
      })
      expect(wrapper.find('form.create-card').exists()).toBe(false)
      expect(wrapper.get('[role="status"]').text()).toContain('Conta de Carla Dias criada.')
      expect(fetchAdminUsers).toHaveBeenCalledTimes(2)
    })

    it('keeps the form open with the error when the server refuses', async () => {
      vi.mocked(createUser).mockRejectedValue(new Error('Já existe uma conta com este e-mail.'))
      const wrapper = await openForm()

      await fill(wrapper)
      await wrapper.get('form.create-card').trigger('submit')
      await flushPromises()

      const form = wrapper.get('form.create-card')
      expect(form.get('[role="alert"]').text()).toBe('Já existe uma conta com este e-mail.')
      expect((form.get('.new-email input').element as HTMLInputElement).value).toBe(
        'carla@akpedia.local',
      )
    })

    it('can be cancelled', async () => {
      const wrapper = await openForm()

      await wrapper.get('form.create-card .row-action').trigger('click')

      expect(wrapper.find('form.create-card').exists()).toBe(false)
      expect(createUser).not.toHaveBeenCalled()
    })
  })

  describe('change requests', () => {
    const withRequests = (requests: ChangeRequest[]) =>
      vi.mocked(fetchProfileRequests).mockResolvedValue({
        content: requests,
        page: 0,
        size: 50,
        totalElements: requests.length,
        totalPages: 1,
      })

    const openRequestsTab = async () => {
      const wrapper = await mountPage()
      await wrapper.get('.tab-requests').trigger('click')
      return wrapper
    }

    it('counts the pending requests on the tab', async () => {
      withRequests([pendingRequest(), pendingRequest({ id: 6, field: 'cpf', newValue: '1' })])
      const wrapper = await mountPage()

      expect(fetchProfileRequests).toHaveBeenCalledWith({ status: 'PENDING', page: 0, size: 50 })
      expect(wrapper.get('.tab-requests .tab-count').text()).toBe('2')
    })

    it('has no count when nothing waits', async () => {
      const wrapper = await openRequestsTab()

      expect(wrapper.find('.tab-count').exists()).toBe(false)
      expect(wrapper.text()).toContain('Nenhuma solicitação pendente.')
    })

    it('lists who asked, the field, current and new value, and the reason', async () => {
      withRequests([
        pendingRequest(),
        pendingRequest({ id: 6, field: 'cpf', newValue: '98765432100', reason: null }),
      ])
      const wrapper = await openRequestsTab()

      const email = wrapper.get('[data-request-id="5"]').text()
      expect(email).toContain('Bruno Lima')
      expect(email).toContain('E-mail')
      expect(email).toContain('bruno@akpedia.local')
      expect(email).toContain('bruno.lima@akpedia.local')
      expect(email).toContain('Mudei de setor')
      expect(wrapper.get('[data-request-id="6"]').text()).toContain('987.654.321-00')
    })

    it('approves after confirmation, then reloads the users', async () => {
      vi.mocked(confirmAction).mockResolvedValue(true)
      withRequests([pendingRequest()])
      vi.mocked(approveProfileRequest).mockResolvedValue(pendingRequest({ status: 'APPROVED' }))
      const wrapper = await openRequestsTab()
      vi.mocked(fetchAdminUsers).mockClear()

      await wrapper.get('.approve-request').trigger('click')
      await flushPromises()

      expect(approveProfileRequest).toHaveBeenCalledWith(5)
      expect(wrapper.find('[data-request-id="5"]').exists()).toBe(false)
      expect(wrapper.find('.tab-count').exists()).toBe(false)
      expect(wrapper.text()).toContain('A pessoa passa a entrar com bruno.lima@akpedia.local')
      expect(fetchAdminUsers).toHaveBeenCalledTimes(1)
    })

    it('asks in a dialog showing the current and the new e-mail', async () => {
      vi.mocked(confirmAction).mockResolvedValue(false)
      withRequests([pendingRequest()])
      const wrapper = await openRequestsTab()

      await wrapper.get('.approve-request').trigger('click')
      await flushPromises()

      expect(confirmAction).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Aprovar a alteração de E-mail?',
          text: expect.stringMatching(/bruno@akpedia\.local para bruno\.lima@akpedia\.local/),
          confirmText: 'Aprovar',
        }),
      )
    })

    it('does not approve when the dialog is cancelled', async () => {
      vi.mocked(confirmAction).mockResolvedValue(false)
      withRequests([pendingRequest()])
      const wrapper = await openRequestsTab()

      await wrapper.get('.approve-request').trigger('click')
      await flushPromises()

      expect(approveProfileRequest).not.toHaveBeenCalled()
      expect(wrapper.find('[data-request-id="5"]').exists()).toBe(true)
    })

    it('shows why an approval failed', async () => {
      vi.mocked(confirmAction).mockResolvedValue(true)
      withRequests([pendingRequest()])
      vi.mocked(approveProfileRequest).mockRejectedValue(
        new Error('Já existe uma conta com este e-mail.'),
      )
      const wrapper = await openRequestsTab()

      await wrapper.get('.approve-request').trigger('click')
      await flushPromises()

      expect(wrapper.get('.requests-tab [role="alert"]').text()).toContain(
        'Já existe uma conta com este e-mail.',
      )
      expect(wrapper.find('[data-request-id="5"]').exists()).toBe(true)
    })

    it('rejects with an optional note', async () => {
      withRequests([pendingRequest()])
      vi.mocked(rejectProfileRequest).mockResolvedValue(pendingRequest({ status: 'REJECTED' }))
      const wrapper = await openRequestsTab()

      await wrapper.get('.reject-request').trigger('click')
      await wrapper.get('.reject-note textarea').setValue('Use o e-mail do setor.')
      await wrapper.get('.reject-form').trigger('submit')
      await flushPromises()

      expect(rejectProfileRequest).toHaveBeenCalledWith(5, 'Use o e-mail do setor.')
      expect(wrapper.find('[data-request-id="5"]').exists()).toBe(false)
      expect(wrapper.text()).toContain('Solicitação de Bruno Lima recusada.')
    })
  })

  describe("editing a user's data", () => {
    const openEdit = async () => {
      const wrapper = await mountPage()
      await row(wrapper, 'kc-bruno').get('.edit-user').trigger('click')
      await flushPromises()
      return wrapper
    }

    it('fills the form from the user’s data', async () => {
      const wrapper = await openEdit()

      const dialog = wrapper.get('[role="dialog"]')
      expect((dialog.get('.edit-email input').element as HTMLInputElement).value).toBe(
        'bruno@akpedia.local',
      )
      expect((dialog.get('.edit-cpf input').element as HTMLInputElement).value).toBe(
        '123.456.789-09',
      )
      expect(dialog.get('.edit-save').attributes('disabled')).toBeDefined()
    })

    it('warns that the e-mail is the login, saves and updates the row', async () => {
      vi.mocked(updateUserProfile).mockResolvedValue({
        ...bruno,
        email: 'bruno.lima@akpedia.local',
      })
      const wrapper = await openEdit()

      await wrapper.get('.edit-email input').setValue('bruno.lima@akpedia.local')
      expect(wrapper.get('.email-warning').text()).toContain('O e-mail é o login')
      await wrapper.get('form[role="dialog"]').trigger('submit')
      await flushPromises()

      expect(updateUserProfile).toHaveBeenCalledWith('kc-bruno', {
        firstName: 'Bruno',
        lastName: 'Lima',
        email: 'bruno.lima@akpedia.local',
        cpf: '123.456.789-09',
        sector: 'Qualidade',
      })
      expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
      expect(row(wrapper, 'kc-bruno').text()).toContain('bruno.lima@akpedia.local')
      expect(wrapper.text()).toContain('Dados de Bruno Lima salvos.')
    })

    it('keeps the dialog open with the error', async () => {
      vi.mocked(updateUserProfile).mockRejectedValue(
        new Error('Já existe uma conta com este e-mail.'),
      )
      const wrapper = await openEdit()

      await wrapper.get('.edit-email input').setValue('ana@akpedia.local')
      await wrapper.get('form[role="dialog"]').trigger('submit')
      await flushPromises()

      expect(wrapper.get('[role="dialog"] [role="alert"]').text()).toContain(
        'Já existe uma conta com este e-mail.',
      )
    })
  })
})
