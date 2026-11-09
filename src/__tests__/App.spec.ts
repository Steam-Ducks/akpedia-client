import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import App from '../App.vue'
import { fetchAccountStatus, type AccountStatus } from '@/services/account'
import { onCpfRefused, onTermsPending } from '@/services/api'
import { fetchMyChangeRequests } from '@/services/profile'
import { useTermsStore } from '@/stores/terms-store'

vi.mock('@/services/api', () => ({ onTermsPending: vi.fn(), onCpfRefused: vi.fn() }))
vi.mock('@/services/auth', () => ({ logout: vi.fn(), refreshSession: vi.fn() }))
vi.mock('@/services/account', () => ({ fetchAccountStatus: vi.fn(), deleteMyAccount: vi.fn() }))
vi.mock('@/services/profile', () => ({
  fetchMyChangeRequests: vi.fn(),
  createChangeRequest: vi.fn(),
}))

const account = (status: Partial<AccountStatus> = {}): AccountStatus => ({
  termsPending: false,
  cpfProblem: null,
  ...status,
})

let router: Router

/** Mounts the app with the user opening `path`, once GET /me answered. */
const mountApp = async (path = '/review') => {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div class="page-stub home" />' } },
      { path: '/review', component: { template: '<div class="page-stub review" />' } },
      { path: '/accept-terms', component: { template: '<main class="terms-page-stub" />' } },
    ],
  })
  await router.push(path)
  const wrapper = mount(App, {
    attachTo: document.body,
    global: {
      plugins: [router],
      stubs: {
        AkSidebar: { template: '<aside class="sidebar-stub" />' },
        AkHeader: { template: '<header class="header-stub" />' },
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
    vi.mocked(fetchAccountStatus).mockResolvedValue(account())
    vi.mocked(fetchMyChangeRequests).mockResolvedValue([])
  })

  it('renders nothing before GET /me answers', async () => {
    vi.mocked(fetchAccountStatus).mockReturnValue(new Promise(() => {}))

    const wrapper = await mountApp()

    expect(wrapper.find('.akpedia-page').exists()).toBe(false)
    expect(wrapper.find('.terms-page-stub').exists()).toBe(false)
    wrapper.unmount()
  })

  it('opens the page when nothing is pending', async () => {
    const wrapper = await mountApp()

    expect(fetchAccountStatus).toHaveBeenCalledTimes(1)
    const layout = wrapper.get('.akpedia-page')
    expect(layout.attributes('inert')).toBeUndefined()
    expect(layout.find('.sidebar-stub').exists()).toBe(true)
    expect(wrapper.find('.page-stub.review').exists()).toBe(true)
    wrapper.unmount()
  })

  it('sends to the terms page, alone, while the terms are pending', async () => {
    vi.mocked(fetchAccountStatus).mockResolvedValue(account({ termsPending: true }))

    const wrapper = await mountApp('/review?page=2')

    expect(router.currentRoute.value.fullPath).toBe('/accept-terms?from=/review?page=2')
    expect(wrapper.find('.terms-page-stub').exists()).toBe(true)
    expect(wrapper.find('.akpedia-page').exists()).toBe(false)
    expect(wrapper.find('.sidebar-stub').exists()).toBe(false)
    wrapper.unmount()
  })

  it('goes back to the page the user opened once the terms are accepted', async () => {
    vi.mocked(fetchAccountStatus).mockResolvedValue(account({ termsPending: true }))
    const wrapper = await mountApp('/review')

    useTermsStore().pending = false
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/review')
    expect(wrapper.find('.page-stub.review').exists()).toBe(true)
    expect(wrapper.find('.terms-page-stub').exists()).toBe(false)
    wrapper.unmount()
  })

  it('leaves the terms page when there is nothing to accept', async () => {
    const wrapper = await mountApp('/accept-terms')

    expect(router.currentRoute.value.fullPath).toBe('/')
    expect(wrapper.find('.page-stub.home').exists()).toBe(true)
    wrapper.unmount()
  })

  it('sends to the terms page when the API answers terms_pending', async () => {
    const wrapper = await mountApp()
    expect(wrapper.find('.page-stub.review').exists()).toBe(true)

    vi.mocked(onTermsPending).mock.calls[0][0]?.()
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/accept-terms')
    expect(wrapper.find('.terms-page-stub').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows the CPF dialog, without the page, when the server refuses the CPF', async () => {
    vi.mocked(fetchAccountStatus).mockResolvedValue(account({ cpfProblem: 'invalid_cpf' }))

    const wrapper = await mountApp()

    const layout = wrapper.get('.akpedia-page')
    expect(layout.attributes('inert')).toBeDefined()
    expect(layout.attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('.page-stub').exists()).toBe(false)
    expect(wrapper.get('[role="dialog"]').text()).toContain('Seu CPF precisa ser corrigido')
    wrapper.unmount()
  })

  it('asks for the terms first, then for the CPF', async () => {
    vi.mocked(fetchAccountStatus).mockResolvedValue(
      account({ termsPending: true, cpfProblem: 'cpf_taken' }),
    )
    const wrapper = await mountApp()
    expect(wrapper.find('.terms-page-stub').exists()).toBe(true)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    useTermsStore().pending = false
    await flushPromises()

    expect(wrapper.get('[role="dialog"]').text()).toContain('já pertence a outro usuário')
    expect(wrapper.find('.page-stub').exists()).toBe(false)
    wrapper.unmount()
  })

  it('brings the CPF dialog up when the API refuses the CPF', async () => {
    const wrapper = await mountApp()
    expect(wrapper.find('.page-stub').exists()).toBe(true)

    vi.mocked(onCpfRefused).mock.calls[0][0]?.('invalid_cpf')
    await flushPromises()

    expect(wrapper.get('[role="dialog"]').text()).toContain('Seu CPF precisa ser corrigido')
    expect(wrapper.find('.page-stub').exists()).toBe(false)
    wrapper.unmount()
  })

  it('offers to try again when GET /me fails', async () => {
    vi.mocked(fetchAccountStatus).mockRejectedValueOnce(new Error('Sem conexão.'))
    const wrapper = await mountApp()
    expect(wrapper.text()).toContain('Sem conexão.')

    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('.page-stub.review').exists()).toBe(true)
    wrapper.unmount()
  })
})
