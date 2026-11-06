import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import AkSidebar from '../AkSidebar.vue'
import type { SessionUser } from '@/services/auth'

const user = ref<SessionUser | null>(null)

vi.mock('@/services/auth', () => ({
  get sessionUser() {
    return user
  },
}))

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => ({ path: '/' }),
}))

const RouterLinkStub = { props: ['to'], template: '<a><slot /></a>' }

const mountSidebar = () => mount(AkSidebar, { global: { stubs: { RouterLink: RouterLinkStub } } })

const asUser = (canReview: boolean): SessionUser => ({
  name: 'Ana Souza',
  email: 'ana@akpedia.local',
  sector: 'Setor 1',
  canReview,
})

describe('AkSidebar', () => {
  beforeEach(() => {
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
})
