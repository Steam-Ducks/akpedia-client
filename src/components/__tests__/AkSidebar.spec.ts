import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import AkSidebar from '../AkSidebar.vue'
import { fetchProfileRequests } from '@/services/admin-profile-requests'
import type { SessionUser } from '@/services/auth'

const user = ref<SessionUser | null>(null)

vi.mock('@/services/auth', () => ({
  get sessionUser() {
    return user
  },
}))

vi.mock('@/services/admin-profile-requests', () => ({ fetchProfileRequests: vi.fn() }))

const pendingRequests = (total: number) =>
  vi.mocked(fetchProfileRequests).mockResolvedValue({
    content: [],
    page: 0,
    size: 1,
    totalElements: total,
    totalPages: total,
  })

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ path: '/' }),
}))

const RouterLinkStub = { props: ['to'], template: '<a :href="to"><slot /></a>' }

const mountSidebar = () => mount(AkSidebar, { global: { stubs: { RouterLink: RouterLinkStub } } })

const asUser = (canReview: boolean, isAdmin = false): SessionUser => ({
  name: 'Ana Souza',
  email: 'ana@akpedia.local',
  sector: 'Engenharia',
  roles: [],
  canReview,
  isAdmin,
})

describe('AkSidebar', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    pendingRequests(0)
    user.value = null
  })

  it('shows "Pendentes" to someone who may review', () => {
    user.value = asUser(true)
    expect(mountSidebar().text()).toContain('Pendentes')
  })

  it('hides "Pendentes" from everyone else', () => {
    user.value = asUser(false)
    const text = mountSidebar().text()
    expect(text).toContain('Enviar documento')
    expect(text).not.toContain('Pendentes')
  })

  it('shows the Administração section to an admin', () => {
    user.value = asUser(true, true)
    const text = mountSidebar().text()
    expect(text).toContain('Administração')
    expect(text).toContain('Usuários')
    expect(text).toContain('Auditoria')
    expect(text).toContain('Termos de uso')
    expect(text).not.toContain('Permissões opcionais')
  })

  it('leaves "Minha conta" to the user menu in the header', () => {
    user.value = asUser(false)
    const targets = mountSidebar()
      .findAllComponents(RouterLinkStub)
      .map((link) => link.props('to'))
    expect(targets).not.toContain('/conta')
  })

  it('links the admin pages', () => {
    user.value = asUser(true, true)
    const targets = mountSidebar()
      .findAllComponents(RouterLinkStub)
      .map((link) => link.props('to'))
    expect(targets).toEqual(
      expect.arrayContaining([
        '/admin/users',
        '/admin/permissions',
        '/admin/audit',
        '/admin/terms',
      ]),
    )
  })

  it('hides the Administração section from everyone else', () => {
    user.value = asUser(true)
    const text = mountSidebar().text()
    expect(text).not.toContain('Administração')
    expect(text).not.toContain('Usuários')
    expect(text).not.toContain('Auditoria')
    expect(text).not.toContain('Termos de uso')
  })

  it('shows an admin how many change requests wait, linking to them', async () => {
    pendingRequests(3)
    user.value = asUser(true, true)

    const wrapper = mountSidebar()
    await flushPromises()

    const badge = wrapper.get('.sidebar-nav-badge')
    expect(badge.text()).toBe('3')
    expect(badge.attributes('aria-label')).toBe('3 solicitações de alteração aguardando análise')
    const targets = wrapper.findAll('a').map((link) => link.attributes('href'))
    expect(targets).toContain('/admin/users?tab=requests')
    expect(fetchProfileRequests).toHaveBeenCalledWith({ status: 'PENDING', size: 1 })
    wrapper.unmount()
  })

  it('shows no badge when nothing waits', async () => {
    user.value = asUser(true, true)

    const wrapper = mountSidebar()
    await flushPromises()

    expect(wrapper.find('.sidebar-nav-badge').exists()).toBe(false)
    wrapper.unmount()
  })

  it('does not ask for the requests for someone who is not an admin', async () => {
    user.value = asUser(true)

    mountSidebar().unmount()
    await flushPromises()

    expect(fetchProfileRequests).not.toHaveBeenCalled()
  })
})
