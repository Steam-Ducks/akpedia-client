import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AkTermsModal from '../AkTermsModal.vue'
import { useTermsStore } from '@/stores/terms-store'
import { deleteMyAccount } from '@/services/account'
import { logout } from '@/services/auth'
import { declineTerms } from '@/services/terms'
import type { TermsVersion } from '@/types/Terms'

vi.mock('@/services/auth', () => ({ logout: vi.fn() }))
vi.mock('@/services/account', () => ({ deleteMyAccount: vi.fn() }))
vi.mock('@/services/terms', () => ({
  fetchTerms: vi.fn(),
  acceptTerms: vi.fn(),
  declineTerms: vi.fn(),
  TermsChangedError: class extends Error {},
}))

const version = (number: string): TermsVersion => ({
  version: number,
  title: 'Termos de uso',
  content: 'Primeiro parágrafo.\n\nSegundo parágrafo <b>sem HTML</b>.',
  publishedAt: new Date('2026-11-06T12:00:00'),
  publishedBy: 'Admin Akpedia',
})

describe('AkTermsModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('shows the current version as plain text in a modal dialog', () => {
    useTermsStore().current = version('3.0')

    const wrapper = mount(AkTermsModal)

    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(wrapper.get(`#${dialog.attributes('aria-labelledby')}`).text()).toBe('Termos de uso')
    expect(wrapper.text()).toContain('Versão 3.0, publicada em 06/11/2026')
    const content = wrapper.get('.terms-content')
    expect(content.text()).toContain('<b>sem HTML</b>')
    expect(content.find('b').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('os termos mudaram')
  })

  it('has no way to be dismissed but accepting or deleting the account', async () => {
    useTermsStore().current = version('3.0')
    const wrapper = mount(AkTermsModal)

    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.findAll('button').map((button) => button.text())).toEqual([
      'Não aceito e desejo excluir minha conta',
      'Aceitar',
    ])
  })

  it('says the terms changed when an older version was accepted', () => {
    const store = useTermsStore()
    store.current = version('3.0')
    store.accepted = { version: '2.0', acceptedAt: new Date() }

    expect(mount(AkTermsModal).text()).toContain('Você aceitou a versão 2.0; os termos mudaram.')
  })

  it('accepts the terms', async () => {
    const store = useTermsStore()
    store.current = version('3.0')
    const accept = vi.spyOn(store, 'accept').mockResolvedValue()

    await mount(AkTermsModal).get('.terms-accept').trigger('click')

    expect(accept).toHaveBeenCalled()
  })

  describe('not accepting', () => {
    const openConfirm = async () => {
      useTermsStore().current = version('3.0')
      const wrapper = mount(AkTermsModal, { attachTo: document.body })
      await wrapper.get('.terms-decline').trigger('click')
      return wrapper
    }

    const confirm = async (wrapper: Awaited<ReturnType<typeof openConfirm>>) => {
      await wrapper.get('.confirm-input input').setValue('EXCLUIR')
      await wrapper.get('form[role="dialog"]').trigger('submit')
      await flushPromises()
    }

    beforeEach(() => {
      document.body.innerHTML = ''
    })

    it('asks for confirmation first, over the inert terms', async () => {
      const wrapper = await openConfirm()

      const confirmDialog = wrapper.get('form[role="dialog"]')
      expect(confirmDialog.text()).toContain('Excluir a sua conta?')
      expect(confirmDialog.text()).toContain('só um administrador poderá cadastrá-lo de novo')
      expect(wrapper.get('.terms-dialog').attributes('inert')).toBeDefined()
      expect(declineTerms).not.toHaveBeenCalled()
      expect(deleteMyAccount).not.toHaveBeenCalled()
      wrapper.unmount()
    })

    it('records the refusal, deletes the account, then logs out', async () => {
      const order: string[] = []
      vi.mocked(declineTerms).mockImplementation(async () => {
        order.push('decline')
      })
      vi.mocked(deleteMyAccount).mockImplementation(async () => {
        order.push('delete')
      })
      vi.mocked(logout).mockImplementation(async () => {
        order.push('logout')
      })
      const wrapper = await openConfirm()

      await confirm(wrapper)

      expect(declineTerms).toHaveBeenCalledWith('3.0')
      expect(order).toEqual(['decline', 'delete', 'logout'])
      wrapper.unmount()
    })

    it('deletes nothing when the refusal cannot be recorded', async () => {
      vi.mocked(declineTerms).mockRejectedValue(new Error('Sem conexão.'))
      const wrapper = await openConfirm()

      await confirm(wrapper)

      expect(deleteMyAccount).not.toHaveBeenCalled()
      expect(logout).not.toHaveBeenCalled()
      expect(wrapper.get('form[role="dialog"] [role="alert"]').text()).toBe('Sem conexão.')
      wrapper.unmount()
    })

    it('shows why the account could not be deleted, and stays', async () => {
      vi.mocked(declineTerms).mockResolvedValue()
      vi.mocked(deleteMyAccount).mockRejectedValue(new Error('Você é o único administrador ativo.'))
      const wrapper = await openConfirm()

      await confirm(wrapper)

      expect(logout).not.toHaveBeenCalled()
      expect(wrapper.get('form[role="dialog"] [role="alert"]').text()).toBe(
        'Você é o único administrador ativo.',
      )
      wrapper.unmount()
    })

    it('goes back to the terms when cancelled', async () => {
      const wrapper = await openConfirm()

      await wrapper.get('.confirm-cancel').trigger('click')
      await flushPromises()

      expect(wrapper.find('form[role="dialog"]').exists()).toBe(false)
      const terms = wrapper.get('.terms-dialog')
      expect(terms.attributes('inert')).toBeUndefined()
      expect(document.activeElement).toBe(terms.element)
      expect(declineTerms).not.toHaveBeenCalled()
      wrapper.unmount()
    })
  })
})
