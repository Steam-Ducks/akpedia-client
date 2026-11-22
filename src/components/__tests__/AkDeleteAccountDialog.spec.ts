import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AkDeleteAccountDialog from '../AkDeleteAccountDialog.vue'
import { deleteMyAccount } from '@/services/account'
import { logout } from '@/services/auth'

vi.mock('@/services/auth', () => ({ logout: vi.fn() }))
vi.mock('@/services/account', () => ({ deleteMyAccount: vi.fn() }))

type Props = InstanceType<typeof AkDeleteAccountDialog>['$props']

const mountDialog = (props: Props = {}) =>
  mount(AkDeleteAccountDialog, { props, attachTo: document.body })

const confirm = async (wrapper: ReturnType<typeof mountDialog>, word = 'EXCLUIR') => {
  await wrapper.get('.confirm-input input').setValue(word)
  await wrapper.get('form[role="dialog"]').trigger('submit')
  await flushPromises()
}

describe('AkDeleteAccountDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('warns that only an admin can register the user again', () => {
    const wrapper = mountDialog()

    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(dialog.text()).toContain('Excluir a sua conta?')
    expect(dialog.text()).toContain('A sua conta e os seus dados pessoais serão excluídos')
    expect(dialog.text()).toContain('só um administrador poderá cadastrá-lo de novo')
    expect(document.activeElement).toBe(wrapper.get('.confirm-input input').element)
    wrapper.unmount()
  })

  it('asks to type EXCLUIR before it can go on', async () => {
    const wrapper = mountDialog()
    const button = wrapper.get('.confirm-delete')
    expect(button.attributes('disabled')).toBeDefined()

    await wrapper.get('.confirm-input input').setValue('excluir')
    expect(button.attributes('disabled')).toBeDefined()

    await wrapper.get('.confirm-input input').setValue('EXCLUIR')
    expect(button.attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('does nothing without the confirmation word', async () => {
    const wrapper = mountDialog()

    await confirm(wrapper, 'sim')

    expect(deleteMyAccount).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('runs beforeDelete, deletes the account, then logs out', async () => {
    const order: string[] = []
    const beforeDelete = vi.fn(async () => {
      order.push('before')
    })
    vi.mocked(deleteMyAccount).mockImplementation(async () => {
      order.push('delete')
    })
    vi.mocked(logout).mockImplementation(async () => {
      order.push('logout')
    })
    const wrapper = mountDialog({ beforeDelete })

    await confirm(wrapper)

    expect(order).toEqual(['before', 'delete', 'logout'])
    wrapper.unmount()
  })

  it('deletes nothing when beforeDelete fails', async () => {
    const wrapper = mountDialog({ beforeDelete: () => Promise.reject(new Error('Sem conexão.')) })

    await confirm(wrapper)

    expect(deleteMyAccount).not.toHaveBeenCalled()
    expect(logout).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toBe('Sem conexão.')
    wrapper.unmount()
  })

  it('shows why it failed, stays logged in and lets the user try again', async () => {
    vi.mocked(deleteMyAccount).mockRejectedValue(new Error('Você é o único administrador ativo.'))
    const wrapper = mountDialog()

    await confirm(wrapper)

    expect(wrapper.get('[role="alert"]').text()).toBe('Você é o único administrador ativo.')
    expect(logout).not.toHaveBeenCalled()
    expect(wrapper.get('.confirm-delete').attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('can be cancelled with the button or Esc', async () => {
    const wrapper = mountDialog()

    await wrapper.get('.confirm-cancel').trigger('click')
    await wrapper.get('form[role="dialog"]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.emitted('cancel')).toHaveLength(2)
    wrapper.unmount()
  })
})
