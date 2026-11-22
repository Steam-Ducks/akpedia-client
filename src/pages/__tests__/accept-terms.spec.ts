import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import AcceptTermsPage from '../accept-terms.vue'
import { useTermsStore } from '@/stores/terms-store'
import { deleteMyAccount } from '@/services/account'
import { logout } from '@/services/auth'
import { declineTerms, fetchTerms } from '@/services/terms'
import type { TermsAcceptance, TermsVersion } from '@/types/Terms'

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

/** Mounts the page once GET /terms answered with these terms. */
const mountPage = async (
  current: TermsVersion | null = version('3.0'),
  accepted: TermsAcceptance | null = null,
) => {
  vi.mocked(fetchTerms).mockResolvedValue({ current, accepted })
  const wrapper = mount(AcceptTermsPage, { attachTo: document.body })
  await flushPromises()
  return wrapper
}

describe('accept-terms page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('says it is loading until the terms come', () => {
    vi.mocked(fetchTerms).mockReturnValue(new Promise(() => {}))

    const wrapper = mount(AcceptTermsPage)

    expect(wrapper.get('[role="status"]').text()).toBe('Carregando os termos de uso…')
    expect(wrapper.find('.terms-accept').exists()).toBe(false)
  })

  it('shows the current version as plain text, and focuses it', async () => {
    const wrapper = await mountPage()

    const card = wrapper.get('.terms-card')
    expect(wrapper.get(`#${card.attributes('aria-labelledby')}`).text()).toBe('Termos de uso')
    expect(wrapper.text()).toContain('Versão 3.0, publicada em 06/11/2026')
    const content = wrapper.get('.terms-content')
    expect(content.text()).toContain('<b>sem HTML</b>')
    expect(content.find('b').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('os termos mudaram')
    expect(document.activeElement).toBe(card.element)
    wrapper.unmount()
  })

  it('offers only accepting or deleting the account', async () => {
    const wrapper = await mountPage()

    expect(wrapper.findAll('button').map((button) => button.text())).toEqual([
      'Não aceito e desejo excluir minha conta',
      'Aceitar',
    ])
    wrapper.unmount()
  })

  it('offers to try again when the terms cannot be loaded', async () => {
    vi.mocked(fetchTerms).mockRejectedValueOnce(new Error('Sem conexão.'))
    const wrapper = mount(AcceptTermsPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Sem conexão.')

    vi.mocked(fetchTerms).mockResolvedValueOnce({ current: version('3.0'), accepted: null })
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('.terms-card').exists()).toBe(true)
  })

  it('says the terms changed when an older version was accepted', async () => {
    const wrapper = await mountPage(version('3.0'), { version: '2.0', acceptedAt: new Date() })

    expect(wrapper.text()).toContain('Você aceitou a versão 2.0; os termos mudaram.')
    wrapper.unmount()
  })

  it('accepts the terms once the box saying they were read is ticked', async () => {
    const wrapper = await mountPage()
    const accept = vi.spyOn(useTermsStore(), 'accept').mockResolvedValue()

    expect(wrapper.text()).toContain('Li e aceito os termos de uso da versão 3.0.')
    expect(wrapper.get('.terms-accept').attributes('disabled')).toBeDefined()
    await wrapper.get('.terms-accept').trigger('click')
    expect(accept).not.toHaveBeenCalled()

    await wrapper.get('.terms-agree-box').setValue(true)
    expect(wrapper.get('.terms-accept').attributes('disabled')).toBeUndefined()
    await wrapper.get('.terms-accept').trigger('click')

    expect(accept).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('unticks the box when a newer version replaces the one on screen', async () => {
    const wrapper = await mountPage()
    await wrapper.get('.terms-agree-box').setValue(true)

    useTermsStore().current = version('4.0')
    await nextTick()

    expect((wrapper.get('.terms-agree-box').element as HTMLInputElement).checked).toBe(false)
    expect(wrapper.get('.terms-accept').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

  describe('not accepting', () => {
    const openConfirm = async () => {
      const wrapper = await mountPage()
      await wrapper.get('.terms-decline').trigger('click')
      return wrapper
    }

    const confirm = async (wrapper: Awaited<ReturnType<typeof openConfirm>>) => {
      await wrapper.get('.confirm-input input').setValue('EXCLUIR')
      await wrapper.get('form[role="dialog"]').trigger('submit')
      await flushPromises()
    }

    it('asks for confirmation first, over the inert terms', async () => {
      const wrapper = await openConfirm()

      const confirmDialog = wrapper.get('form[role="dialog"]')
      expect(confirmDialog.text()).toContain('Excluir a sua conta?')
      expect(confirmDialog.text()).toContain('só um administrador poderá cadastrá-lo de novo')
      expect(wrapper.get('.terms-card').attributes('inert')).toBeDefined()
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
      const terms = wrapper.get('.terms-card')
      expect(terms.attributes('inert')).toBeUndefined()
      expect(document.activeElement).toBe(terms.element)
      expect(declineTerms).not.toHaveBeenCalled()
      wrapper.unmount()
    })
  })
})
