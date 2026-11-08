import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import AccountPage from '../conta.vue'
import { deleteMyAccount } from '@/services/account'
import { logout, refreshSession, type SessionUser } from '@/services/auth'
import {
  cancelChangeRequest,
  createChangeRequest,
  fetchMyChangeRequests,
  fetchMyProfile,
  updateMyProfile,
} from '@/services/profile'
import type { ChangeRequest, Profile } from '@/types/Profile'

const session = ref<SessionUser | null>(null)

import { confirmAction } from '@/utils/confirm'

vi.mock('@/utils/confirm', () => ({ confirmAction: vi.fn() }))
vi.mock('@/services/auth', () => ({
  get sessionUser() {
    return session
  },
  logout: vi.fn(),
  refreshSession: vi.fn(),
}))

vi.mock('@/services/account', () => ({ deleteMyAccount: vi.fn() }))

vi.mock('@/services/profile', () => ({
  fetchMyProfile: vi.fn(),
  updateMyProfile: vi.fn(),
  fetchMyChangeRequests: vi.fn(),
  createChangeRequest: vi.fn(),
  cancelChangeRequest: vi.fn(),
}))

const profile: Profile = {
  firstName: 'Ana',
  lastName: 'Souza',
  email: 'ana@akpedia.local',
  cpf: '12345678901',
  sector: 'Setor 3',
  roles: ['offline_access', 'STANDARD', 'APPROVER'],
  editable: ['first_name', 'last_name', 'sector'],
  requestable: ['email', 'cpf'],
}

const changeRequest = (overrides: Partial<ChangeRequest> = {}): ChangeRequest => ({
  id: 1,
  field: 'email',
  newValue: 'ana.souza@akpedia.local',
  reason: null,
  status: 'PENDING',
  createdAt: new Date('2026-11-01T10:00:00Z'),
  decidedAt: null,
  decisionNote: null,
  decidedByName: null,
  user: null,
  ...overrides,
})

const mountPage = async () => {
  const wrapper = mount(AccountPage, { attachTo: document.body })
  await flushPromises()
  return wrapper
}

describe('account page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    session.value = {
      name: 'Ana Souza',
      email: 'ana@akpedia.local',
      sector: 'Setor 3',
      roles: ['offline_access', 'STANDARD', 'APPROVER'],
      canReview: true,
      isAdmin: false,
    }
    vi.mocked(fetchMyProfile).mockResolvedValue({ ...profile })
    vi.mocked(fetchMyChangeRequests).mockResolvedValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows a header with initials, name, e-mail and the app’s roles only', async () => {
    const wrapper = await mountPage()

    expect(wrapper.get('.hero-avatar').text()).toBe('AS')
    expect(wrapper.get('.profile-name').text()).toBe('Ana Souza')
    expect(wrapper.get('.profile-email').text()).toBe('ana@akpedia.local')
    expect(wrapper.get('.profile-sector').text()).toBe('Setor 3')
    expect(wrapper.get('.profile-roles').text()).toBe('PadrãoAprovador')
  })

  it('fills the form and shows e-mail and CPF read-only, the CPF formatted', async () => {
    const wrapper = await mountPage()

    expect((wrapper.get('.first-name input').element as HTMLInputElement).value).toBe('Ana')
    expect((wrapper.get('.last-name input').element as HTMLInputElement).value).toBe('Souza')
    expect((wrapper.get('.sector select').element as HTMLSelectElement).value).toBe('Setor 3')
    expect(wrapper.get('.locked-email').text()).toContain('ana@akpedia.local')
    expect(wrapper.get('.locked-cpf').text()).toContain('123.456.789-01')
    expect(wrapper.find('.locked-email input').exists()).toBe(false)
  })

  it('enables "Salvar" only once something changed', async () => {
    const wrapper = await mountPage()
    const save = () => wrapper.get('.save-profile').attributes('disabled')

    expect(save()).toBeDefined()
    await wrapper.get('.first-name input').setValue('Ana Maria')
    expect(save()).toBeUndefined()
    await wrapper.get('.first-name input').setValue('Ana')
    expect(save()).toBeDefined()
  })

  it('saves, then refreshes the session so the header shows the new name', async () => {
    vi.mocked(updateMyProfile).mockResolvedValue({ ...profile, firstName: 'Ana Maria' })
    const wrapper = await mountPage()

    await wrapper.get('.first-name input').setValue('Ana Maria ')
    await wrapper.get('.sector select').setValue('Setor 5')
    await wrapper.get('.profile-form').trigger('submit')
    await flushPromises()

    expect(updateMyProfile).toHaveBeenCalledWith({
      firstName: 'Ana Maria ',
      lastName: 'Souza',
      sector: 'Setor 5',
    })
    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Dados salvos.')
    expect(wrapper.get('.profile-name').text()).toBe('Ana Maria Souza')
  })

  it('shows a save error inline', async () => {
    vi.mocked(updateMyProfile).mockRejectedValue(new Error('O nome é obrigatório.'))
    const wrapper = await mountPage()

    await wrapper.get('.first-name input').setValue('Ana Maria')
    await wrapper.get('.profile-form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('O nome é obrigatório.')
    expect(refreshSession).not.toHaveBeenCalled()
  })

  it('says when the profile cannot be loaded', async () => {
    vi.mocked(fetchMyProfile).mockRejectedValue(new Error('Keycloak fora do ar.'))
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Keycloak fora do ar.')
    expect(wrapper.find('.profile-form').exists()).toBe(false)
  })

  describe('asking for an e-mail or CPF change', () => {
    it('sends the request from the dialog and lists it', async () => {
      vi.mocked(createChangeRequest).mockResolvedValue(changeRequest())
      const wrapper = await mountPage()

      await wrapper.get('.locked-email .request-change').trigger('click')
      const dialog = wrapper.get('[role="dialog"]')
      expect(dialog.text()).toContain('Solicitar alteração de e-mail')
      expect(dialog.text()).toContain('Um administrador vai analisar o pedido.')
      expect(dialog.get('.request-send').attributes('disabled')).toBeDefined()

      await dialog.get('.request-value input').setValue('ana.souza@akpedia.local')
      await dialog.get('.request-reason textarea').setValue('Mudei de nome')
      await dialog.trigger('submit')
      await flushPromises()

      expect(createChangeRequest).toHaveBeenCalledWith({
        field: 'email',
        newValue: 'ana.souza@akpedia.local',
        reason: 'Mudei de nome',
      })
      expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
      expect(wrapper.get('.requests-card').text()).toContain('Pendente')
      expect(wrapper.get('.locked-email').text()).toContain('aguardando')
      expect(wrapper.find('.locked-email .request-change').exists()).toBe(false)
    })

    it('checks the CPF has 11 digits before sending', async () => {
      const wrapper = await mountPage()

      await wrapper.get('.locked-cpf .request-change').trigger('click')
      const dialog = wrapper.get('[role="dialog"]')
      expect(dialog.text()).toContain('123.456.789-01')
      await dialog.get('.request-value input').setValue('123')

      expect(dialog.text()).toContain('O CPF deve ter 11 dígitos.')
      expect(dialog.get('.request-send').attributes('disabled')).toBeDefined()
    })

    it('shows the server’s refusal in the dialog', async () => {
      vi.mocked(createChangeRequest).mockRejectedValue(
        new Error('Já existe uma conta com este e-mail.'),
      )
      const wrapper = await mountPage()

      await wrapper.get('.locked-email .request-change').trigger('click')
      await wrapper.get('.request-value input').setValue('bruno@akpedia.local')
      await wrapper.get('form[role="dialog"]').trigger('submit')
      await flushPromises()

      expect(wrapper.get('[role="dialog"] [role="alert"]').text()).toContain(
        'Já existe uma conta com este e-mail.',
      )
    })
  })

  describe('the requests card', () => {
    it('is hidden while there are none', async () => {
      const wrapper = await mountPage()

      expect(wrapper.find('.requests-card').exists()).toBe(false)
    })

    it('lists the requests with their status and the admin’s note', async () => {
      vi.mocked(fetchMyChangeRequests).mockResolvedValue([
        changeRequest({ id: 2, field: 'cpf', newValue: '98765432100' }),
        changeRequest({
          id: 1,
          status: 'REJECTED',
          decidedAt: new Date('2026-11-02T10:00:00Z'),
          decisionNote: 'Use o e-mail do setor.',
          decidedByName: 'Admin Akpedia',
        }),
      ])
      const wrapper = await mountPage()

      const cpf = wrapper.get('[data-request-id="2"]')
      expect(cpf.text()).toContain('987.654.321-00')
      expect(cpf.text()).toContain('Pendente')
      expect(cpf.find('.cancel-request').exists()).toBe(true)
      const email = wrapper.get('[data-request-id="1"]')
      expect(email.text()).toContain('Recusada')
      expect(email.text()).toContain('Use o e-mail do setor.')
      expect(email.find('.cancel-request').exists()).toBe(false)
    })

    it('cancels a pending request after confirmation', async () => {
      vi.mocked(confirmAction).mockResolvedValue(true)
      vi.mocked(cancelChangeRequest).mockResolvedValue()
      vi.mocked(fetchMyChangeRequests).mockResolvedValue([changeRequest()])
      const wrapper = await mountPage()

      await wrapper.get('.cancel-request').trigger('click')
      await flushPromises()

      expect(cancelChangeRequest).toHaveBeenCalledWith(1)
      expect(wrapper.find('.requests-card').exists()).toBe(false)
      expect(wrapper.find('.locked-email .request-change').exists()).toBe(true)
    })
  })

  it('says that only an admin can register a deleted account again', async () => {
    const wrapper = await mountPage()

    expect(wrapper.get('.danger-zone').text()).toContain(
      'só um administrador poderá cadastrá-lo de novo',
    )
  })

  describe('deleting the account', () => {
    const openConfirm = async () => {
      const wrapper = await mountPage()
      await wrapper.get('.delete-account').trigger('click')
      return wrapper
    }

    it('asks for confirmation', async () => {
      const wrapper = await openConfirm()

      expect(wrapper.get('[role="dialog"]').text()).toContain('Excluir a sua conta?')
      expect(wrapper.get('.confirm-delete').attributes('disabled')).toBeDefined()
    })

    it('deletes the account, then logs out', async () => {
      vi.mocked(deleteMyAccount).mockResolvedValue()
      const wrapper = await openConfirm()

      await wrapper.get('.confirm-input input').setValue('EXCLUIR')
      await wrapper.get('form[role="dialog"]').trigger('submit')
      await flushPromises()

      expect(deleteMyAccount).toHaveBeenCalledTimes(1)
      expect(logout).toHaveBeenCalledTimes(1)
    })

    it('can be cancelled', async () => {
      const wrapper = await openConfirm()

      await wrapper.get('.confirm-cancel').trigger('click')

      expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    })
  })
})
