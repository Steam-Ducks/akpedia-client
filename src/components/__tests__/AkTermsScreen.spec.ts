import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AkTermsScreen from '../AkTermsScreen.vue'
import { useTermsStore } from '@/stores/terms-store'
import { logout } from '@/services/auth'
import type { TermsVersion } from '@/types/Terms'

vi.mock('@/services/auth', () => ({ logout: vi.fn() }))
vi.mock('@/services/terms', () => ({
  fetchTerms: vi.fn(),
  acceptTerms: vi.fn(),
  TermsChangedError: class extends Error {},
}))

const version = (number: number): TermsVersion => ({
  version: number,
  title: 'Termos de uso',
  content: 'Primeiro parágrafo.\n\nSegundo parágrafo <b>sem HTML</b>.',
  publishedAt: new Date('2026-11-06T12:00:00'),
  publishedBy: 'Admin Akpedia',
})

describe('AkTermsScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('shows the current version as plain text', () => {
    useTermsStore().current = version(3)

    const wrapper = mount(AkTermsScreen)

    expect(wrapper.text()).toContain('Termos de uso')
    expect(wrapper.text()).toContain('Versão 3, publicada em 06/11/2026')
    const content = wrapper.get('.terms-content')
    expect(content.text()).toContain('<b>sem HTML</b>')
    expect(content.find('b').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('os termos mudaram')
  })

  it('says the terms changed when an older version was accepted', () => {
    const store = useTermsStore()
    store.current = version(3)
    store.accepted = { version: 2, acceptedAt: new Date() }

    expect(mount(AkTermsScreen).text()).toContain('Você aceitou a versão 2; os termos mudaram.')
  })

  it('accepts the terms', async () => {
    const store = useTermsStore()
    store.current = version(3)
    const accept = vi.spyOn(store, 'accept').mockResolvedValue()

    await mount(AkTermsScreen).get('.terms-accept').trigger('click')

    expect(accept).toHaveBeenCalled()
  })

  it('logs out when the terms are declined', async () => {
    useTermsStore().current = version(3)

    await mount(AkTermsScreen).get('.terms-decline').trigger('click')

    expect(logout).toHaveBeenCalled()
  })
})
