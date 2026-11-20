import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reactive } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import IndexPage from '../index.vue'
import { useChatStore } from '@/stores/chat-store'

const route = reactive<{ query: Record<string, string | undefined> }>({ query: {} })
const replace = vi.fn(async (to: { query: Record<string, string | undefined> }) => {
  route.query = to.query
})

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => route,
  useRouter: () => ({ replace, push: vi.fn() }),
}))

vi.mock('@/services/search', () => ({
  fetchRecentDocuments: vi.fn().mockResolvedValue([]),
  fetchCategories: vi.fn().mockResolvedValue([]),
  searchDocuments: vi.fn().mockResolvedValue([]),
}))

describe('home page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    route.query = {}
    replace.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('mostra o dia da semana e a data de hoje na saudação', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 12, 10))

    const wrapper = mount(IndexPage)

    expect(wrapper.find('.salutation-date').text()).toBe('quinta-feira, 12 de novembro')
  })

  it('esconde a saudação no chat depois da primeira pergunta', async () => {
    route.query = { mode: 'chat' }
    const wrapper = mount(IndexPage)
    expect(wrapper.find('.salutation-wrapper').classes()).not.toContain('hidden')

    useChatStore().turns.push({
      id: 0,
      question: 'Oi',
      status: 'loading',
      answer: null,
      error: null,
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.salutation-wrapper').classes()).toContain('hidden')
    expect(wrapper.find('.salutation-wrapper').attributes('aria-hidden')).toBe('true')
  })

  it('mostra a saudação na busca mesmo com conversa guardada', () => {
    useChatStore().turns.push({
      id: 0,
      question: 'Oi',
      status: 'done',
      answer: null,
      error: null,
    })

    const wrapper = mount(IndexPage)

    expect(wrapper.find('.salutation-wrapper').classes()).not.toContain('hidden')
  })

  it('abre na busca, sem o chat', () => {
    const wrapper = mount(IndexPage)

    expect(wrapper.find('.searchbox-form').exists()).toBe(true)
    expect(wrapper.find('.chat-panel').exists()).toBe(false)
    const radios = wrapper.findAll('[role="radio"]')
    expect(radios.map((r) => r.attributes('aria-checked'))).toEqual(['true', 'false'])
  })

  it('abre no chat quando a URL tem ?mode=chat', () => {
    route.query = { mode: 'chat' }

    const wrapper = mount(IndexPage)

    expect(wrapper.find('.chat-panel').exists()).toBe(true)
    expect(wrapper.find('.chat-input').exists()).toBe(true)
    expect(wrapper.find('.searchbox-form').exists()).toBe(false)
  })

  it('põe o seletor de modo no cabeçalho da Busca Inteligente', () => {
    const wrapper = mount(IndexPage)

    expect(wrapper.find('.searchbox-header [role="radiogroup"]').exists()).toBe(true)
  })

  it('no chat, o painel de conversa fica acima da caixa', () => {
    route.query = { mode: 'chat' }

    const wrapper = mount(IndexPage)

    const html = wrapper.html()
    expect(html.indexOf('chat-panel')).toBeLessThan(html.indexOf('searchbox-wrapper'))
  })

  it('anima a caixa até a nova posição ao trocar de modo', async () => {
    const animate = vi.fn()
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    HTMLElement.prototype.animate = animate
    let top = 100
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(() => ({ top }) as DOMRect)
    const wrapper = mount(IndexPage)

    const radios = wrapper.findAll('[role="radio"]')
    rect.mockImplementationOnce(() => ({ top: 100 }) as DOMRect)
    top = 500
    await radios[1].trigger('click')
    await vi.waitFor(() => expect(animate).toHaveBeenCalled())

    expect(animate.mock.calls[0][0]).toEqual([
      { transform: 'translateY(-400px)' },
      { transform: 'translateY(0)' },
    ])
    rect.mockRestore()
    vi.unstubAllGlobals()
    delete (HTMLElement.prototype as Partial<HTMLElement>).animate
  })

  it('cancela a animação em andamento ao trocar de modo de novo', async () => {
    const cancel = vi.fn()
    const animate = vi.fn(() => ({ cancel }))
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    HTMLElement.prototype.animate = animate as unknown as typeof HTMLElement.prototype.animate
    let top = 100
    const rect = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(() => ({ top }) as DOMRect)
    const wrapper = mount(IndexPage)
    const radios = wrapper.findAll('[role="radio"]')

    top = 500
    rect.mockImplementationOnce(() => ({ top: 100 }) as DOMRect)
    await radios[1].trigger('click')
    await vi.waitFor(() => expect(animate).toHaveBeenCalledTimes(1))
    expect(cancel).not.toHaveBeenCalled()

    top = 100
    rect.mockImplementationOnce(() => ({ top: 500 }) as DOMRect)
    await radios[0].trigger('click')
    await vi.waitFor(() => expect(animate).toHaveBeenCalledTimes(2))

    expect(cancel).toHaveBeenCalledTimes(1)
    rect.mockRestore()
    vi.unstubAllGlobals()
    delete (HTMLElement.prototype as Partial<HTMLElement>).animate
  })

  it('guarda o modo na URL ao trocar', async () => {
    const wrapper = mount(IndexPage)

    await wrapper.findAll('[role="radio"]')[1].trigger('click')
    expect(replace).toHaveBeenLastCalledWith({ query: { mode: 'chat' } })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.chat-panel').exists()).toBe(true)

    await wrapper.findAll('[role="radio"]')[0].trigger('click')
    expect(replace).toHaveBeenLastCalledWith({ query: { mode: undefined } })
  })
})
