import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from '../App.vue'
import { fetchAccountStatus } from '@/services/account'
import { onCpfRefused, onTermsNotAccepted } from '@/services/api'
import { fetchMyChangeRequests } from '@/services/profile'
import { acceptTerms, fetchTerms } from '@/services/terms'
import type { TermsVersion } from '@/types/Terms'

vi.mock('@/services/api', () => ({ onTermsNotAccepted: vi.fn(), onCpfRefused: vi.fn() }))
vi.mock('@/services/auth', () => ({ logout: vi.fn(), refreshSession: vi.fn() }))
vi.mock('@/services/account', () => ({ fetchAccountStatus: vi.fn(), deleteMyAccount: vi.fn() }))
vi.mock('@/services/profile', () => ({
  fetchMyChangeRequests: vi.fn(),
  createChangeRequest: vi.fn(),
}))
vi.mock('@/services/terms', () => ({
  fetchTerms: vi.fn(),
  acceptTerms: vi.fn(),
  declineTerms: vi.fn(),
  TermsChangedError: class extends Error {},
}))

const version = (number: string): TermsVersion => ({
  version: number,
  title: 'Termos de uso',
  content: 'Texto dos termos.',
  publishedAt: new Date('2026-11-06T12:00:00'),
  publishedBy: 'Admin Akpedia',
})

const mountApp = async () => {
  const wrapper = mount(App, {
    attachTo: document.body,
    global: {
      stubs: {
        AkSidebar: { template: '<aside class="sidebar-stub" />' },
        AkHeader: { template: '<header class="header-stub" />' },
        RouterView: { template: '<div class="page-stub" />' },
      },
    },
  })
  await flushPromises()
  return wrapper
}

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    document.body.innerHTML = ''
    vi.mocked(fetchAccountStatus).mockResolvedValue({ cpfProblem: null })
    vi.mocked(fetchMyChangeRequests).mockResolvedValue([])
  })

  it('renders nothing before the terms status is known', () => {
    vi.mocked(fetchTerms).mockReturnValue(new Promise(() => {}))

    const wrapper = mount(App, { global: { stubs: { RouterView: true } } })

    expect(wrapper.find('.akpedia-page').exists()).toBe(false)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('opens the page when the current terms were accepted', async () => {
    vi.mocked(fetchTerms).mockResolvedValue({
      current: version('1.0'),
      accepted: { version: '1.0', acceptedAt: new Date() },
    })

    const wrapper = await mountApp()

    const layout = wrapper.get('.akpedia-page')
    expect(layout.attributes('inert')).toBeUndefined()
    expect(layout.attributes('aria-hidden')).toBeUndefined()
    expect(wrapper.find('.page-stub').exists()).toBe(true)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows the terms dialog over the inert layout, without the page, while pending', async () => {
    vi.mocked(fetchTerms).mockResolvedValue({ current: version('2.0'), accepted: null })

    const wrapper = await mountApp()

    const layout = wrapper.get('.akpedia-page')
    expect(layout.attributes('inert')).toBeDefined()
    expect(layout.attributes('aria-hidden')).toBe('true')
    expect(layout.find('.sidebar-stub').exists()).toBe(true)
    expect(wrapper.find('.page-stub').exists()).toBe(false)

    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
    expect(layout.element.contains(dialog.element)).toBe(false)
    expect(document.activeElement).toBe(dialog.element)
    wrapper.unmount()
  })

  it('opens the page once the terms are accepted', async () => {
    vi.mocked(fetchTerms).mockResolvedValue({ current: version('2.0'), accepted: null })
    vi.mocked(acceptTerms).mockResolvedValue({ version: '2.0', acceptedAt: new Date() })
    const wrapper = await mountApp()

    await wrapper.get('.terms-agree-box').setValue(true)
    await wrapper.get('.terms-accept').trigger('click')
    await flushPromises()

    expect(acceptTerms).toHaveBeenCalledWith('2.0')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.get('.akpedia-page').attributes('inert')).toBeUndefined()
    expect(wrapper.find('.page-stub').exists()).toBe(true)
    wrapper.unmount()
  })

  it('brings the dialog back when the API answers terms_not_accepted', async () => {
    vi.mocked(fetchTerms).mockResolvedValueOnce({
      current: version('1.0'),
      accepted: { version: '1.0', acceptedAt: new Date() },
    })
    const wrapper = await mountApp()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    vi.mocked(fetchTerms).mockResolvedValueOnce({
      current: version('2.0'),
      accepted: { version: '1.0', acceptedAt: new Date() },
    })
    const callback = vi.mocked(onTermsNotAccepted).mock.calls[0][0]
    callback?.()
    await flushPromises()

    expect(wrapper.get('[role="dialog"]').text()).toContain(
      'Você aceitou a versão 1.0; os termos mudaram.',
    )
    expect(wrapper.find('.page-stub').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows the CPF dialog, without the page, when the server refuses the CPF', async () => {
    vi.mocked(fetchTerms).mockResolvedValue({
      current: version('1.0'),
      accepted: { version: '1.0', acceptedAt: new Date() },
    })
    vi.mocked(fetchAccountStatus).mockResolvedValue({ cpfProblem: 'invalid_cpf' })

    const wrapper = await mountApp()

    expect(wrapper.get('.akpedia-page').attributes('inert')).toBeDefined()
    expect(wrapper.find('.page-stub').exists()).toBe(false)
    expect(wrapper.get('[role="dialog"]').text()).toContain('Seu CPF precisa ser corrigido')
    wrapper.unmount()
  })

  it('asks for the terms first, then for the CPF', async () => {
    vi.mocked(fetchTerms).mockResolvedValue({ current: version('2.0'), accepted: null })
    vi.mocked(acceptTerms).mockResolvedValue({ version: '2.0', acceptedAt: new Date() })
    vi.mocked(fetchAccountStatus).mockResolvedValue({ cpfProblem: 'cpf_taken' })
    const wrapper = await mountApp()
    expect(wrapper.find('.terms-accept').exists()).toBe(true)

    await wrapper.get('.terms-agree-box').setValue(true)
    await wrapper.get('.terms-accept').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="dialog"]').text()).toContain('já pertence a outro usuário')
    expect(wrapper.find('.page-stub').exists()).toBe(false)
    wrapper.unmount()
  })

  it('brings the CPF dialog up when the API refuses the CPF', async () => {
    vi.mocked(fetchTerms).mockResolvedValue({
      current: version('1.0'),
      accepted: { version: '1.0', acceptedAt: new Date() },
    })
    const wrapper = await mountApp()
    expect(wrapper.find('.page-stub').exists()).toBe(true)

    vi.mocked(onCpfRefused).mock.calls[0][0]?.('invalid_cpf')
    await flushPromises()

    expect(wrapper.get('[role="dialog"]').text()).toContain('Seu CPF precisa ser corrigido')
    expect(wrapper.find('.page-stub').exists()).toBe(false)
    wrapper.unmount()
  })
})
