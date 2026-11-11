import { describe, it, expect, vi } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import NoPermissionPage from '../no-permission.vue'

const query = vi.hoisted(() => ({ value: {} as Record<string, string> }))

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ query: query.value }),
}))

const mountPage = () =>
  mount(NoPermissionPage, { global: { stubs: { RouterLink: RouterLinkStub } } })

describe('no-permission page', () => {
  it('says which address the user may not open, and links back home', () => {
    query.value = { from: '/admin/users' }
    const wrapper = mountPage()

    expect(wrapper.text()).toContain('Sem permissão')
    expect(wrapper.get('.attempted-path').text()).toBe('/admin/users')
    expect(wrapper.getComponent(RouterLinkStub).props('to')).toBe('/')
  })

  it('speaks of "this page" without an address, or with one that is not a path', () => {
    query.value = { from: 'https://elsewhere.test' }
    const wrapper = mountPage()

    expect(wrapper.find('.attempted-path').exists()).toBe(false)
    expect(wrapper.text()).toContain('esta página')
  })
})
