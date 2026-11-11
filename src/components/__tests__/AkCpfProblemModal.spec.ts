import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AkCpfProblemModal from '../AkCpfProblemModal.vue'
import { fetchAccountStatus } from '@/services/account'
import { logout, refreshSession } from '@/services/auth'
import { createChangeRequest, fetchMyChangeRequests } from '@/services/profile'
import { useCpfStore } from '@/stores/cpf-store'
import type { ChangeRequest, ChangeRequestStatus } from '@/types/Profile'

vi.mock('@/services/auth', () => ({ logout: vi.fn(), refreshSession: vi.fn() }))
vi.mock('@/services/account', () => ({ fetchAccountStatus: vi.fn() }))
vi.mock('@/services/profile', () => ({
  fetchMyChangeRequests: vi.fn(),
  createChangeRequest: vi.fn(),
}))

const request = (status: ChangeRequestStatus, note: string | null = null): ChangeRequest => ({
  id: 3,
  field: 'cpf',
  newValue: '52998224725',
  reason: null,
  status,
  createdAt: new Date('2026-11-09T10:00:00'),
  decidedAt: status === 'PENDING' ? null : new Date('2026-11-09T11:00:00'),
  decisionNote: note,
  decidedByName: null,
  user: null,
})

const mountModal = async (problem: 'invalid_cpf' | 'cpf_taken' = 'invalid_cpf') => {
  useCpfStore().refused(problem)
  const wrapper = mount(AkCpfProblemModal)
  await flushPromises()
  return wrapper
}

describe('AkCpfProblemModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(fetchMyChangeRequests).mockResolvedValue([])
  })

  it('says why the CPF was refused', async () => {
    expect((await mountModal('invalid_cpf')).text()).toContain('é inválido')
    expect((await mountModal('cpf_taken')).text()).toContain('já pertence a outro usuário')
  })

  it('sends the right CPF to the admins, then shows the request waiting', async () => {
    vi.mocked(createChangeRequest).mockResolvedValue(request('PENDING'))
    const wrapper = await mountModal()
    expect(wrapper.get('.cpf-send').attributes('disabled')).toBeDefined()

    await wrapper.get('.cpf-value input').setValue('529.982.247-25')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(createChangeRequest).toHaveBeenCalledWith({
      field: 'cpf',
      newValue: '529.982.247-25',
      reason: '',
    })
    expect(wrapper.text()).toContain('Aguarde a análise')
    expect(wrapper.text()).toContain('529.982.247-25')
    expect(wrapper.find('.cpf-recheck').exists()).toBe(true)
  })

  it('does not send a CPF with wrong check digits', async () => {
    const wrapper = await mountModal()

    await wrapper.get('.cpf-value input').setValue('529.982.247-26')

    expect(wrapper.text()).toContain('CPF inválido')
    expect(wrapper.get('.cpf-send').attributes('disabled')).toBeDefined()
  })

  it('shows a request already waiting instead of the form', async () => {
    vi.mocked(fetchMyChangeRequests).mockResolvedValue([request('PENDING')])

    const wrapper = await mountModal()

    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).toContain('Aguarde a análise')
  })

  it('shows why the last request was turned down, with the form to try again', async () => {
    vi.mocked(fetchMyChangeRequests).mockResolvedValue([request('REJECTED', 'Número errado')])

    const wrapper = await mountModal()

    expect(wrapper.text()).toContain('foi recusado: Número errado')
    expect(wrapper.find('form').exists()).toBe(true)
  })

  it('checks again with a new token once the request was approved', async () => {
    vi.mocked(fetchMyChangeRequests).mockResolvedValue([request('APPROVED')])
    vi.mocked(fetchAccountStatus).mockResolvedValue({ termsPending: false, cpfProblem: null })

    await mountModal()

    expect(refreshSession).toHaveBeenCalled()
    expect(useCpfStore().problem).toBeNull()
  })

  it('lets the user log out', async () => {
    const wrapper = await mountModal()

    await wrapper.get('.cpf-logout').trigger('click')

    expect(logout).toHaveBeenCalled()
  })
})
