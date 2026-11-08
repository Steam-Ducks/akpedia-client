import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import AkHeader from '../AkHeader.vue'
import { logout } from '@/services/auth'

vi.mock('@/services/auth', () => ({
  sessionUser: ref({ name: 'Ana Maria Souza', email: 'ana@akpedia.local', sector: 'Setor 1' }),
  logout: vi.fn(),
}))

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ path: '/' }),
}))

const RouterLinkStub = { props: ['to'], template: '<a><slot /></a>' }

const mountHeader = () => mount(AkHeader, { global: { stubs: { RouterLink: RouterLinkStub } } })

describe('AkHeader', () => {
  it('shows the initials of the first and last names', () => {
    expect(mountHeader().find('.user-icon').text()).toBe('AS')
  })

  it('opens a menu with the user, "Minha conta" and "Sair"', async () => {
    const wrapper = mountHeader()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)

    await wrapper.find('.user-icon').trigger('click')

    const menu = wrapper.find('[role="menu"]')
    expect(menu.text()).toContain('ana@akpedia.local')
    const link = wrapper.findComponent(RouterLinkStub)
    expect(link.props('to')).toBe('/conta')
    expect(link.text()).toContain('Minha conta')
  })

  it('logs out from the menu', async () => {
    const wrapper = mountHeader()
    await wrapper.find('.user-icon').trigger('click')
    await wrapper.find('button.menu-item').trigger('click')
    expect(logout).toHaveBeenCalled()
  })
})
