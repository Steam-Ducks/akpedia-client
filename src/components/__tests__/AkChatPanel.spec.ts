import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AkChatPanel from '../AkChatPanel.vue'
import { useChatStore } from '@/stores/chat-store'

const push = vi.fn()

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRouter: () => ({ push }),
}))

const reply = (body: unknown) => vi.fn().mockResolvedValue({ ok: true, json: async () => body })

describe('AkChatPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    push.mockClear()
    vi.unstubAllGlobals()
  })

  it('mostra pergunta e resposta sem os marcadores, com as fontes ligadas ao documento', async () => {
    vi.stubGlobal(
      'fetch',
      reply({
        answer: 'Em até 7 dias [1].',
        found: true,
        sources: [{ document_id: 42, name: 'Manual de Reembolso', category: 'Financeiro' }],
      }),
    )
    const wrapper = mount(AkChatPanel)

    await useChatStore().ask('Qual o prazo?')
    await vi.waitFor(() => expect(wrapper.find('.chat-answer-text').exists()).toBe(true))

    expect(wrapper.find('.chat-question').text()).toBe('Qual o prazo?')
    expect(wrapper.find('.chat-answer-text').text()).toBe('Em até 7 dias.')
    const card = wrapper.find('.source-card')
    expect(card.text()).toContain('Manual de Reembolso')
    expect(card.text()).toContain('Financeiro')
    await card.trigger('click')
    expect(push).toHaveBeenCalledWith('/docs/42')
  })

  it('mostra uma mensagem clara, sem fontes, quando nada foi encontrado', async () => {
    vi.stubGlobal('fetch', reply({ answer: '', found: false, sources: [] }))
    const wrapper = mount(AkChatPanel)

    await useChatStore().ask('Algo?')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Não encontrei nada'))

    expect(wrapper.find('.source-card').exists()).toBe(false)
  })

  it('avisa que o assistente está indisponível e deixa reenviar a pergunta', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ code: 'chat_unavailable', message: 'x' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ answer: 'Sim.', found: true, sources: [] }),
      })
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = mount(AkChatPanel)

    await useChatStore().ask('Oi')
    await vi.waitFor(() => expect(wrapper.text()).toContain('indisponível'))
    expect(wrapper.find('.chat-question').text()).toBe('Oi')

    await wrapper.find('.chat-answer button').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('.chat-answer-text').text()).toBe('Sim.'))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('mantém a conversa ao remontar o painel', async () => {
    vi.stubGlobal('fetch', reply({ answer: 'Sim.', found: true, sources: [] }))
    const first = mount(AkChatPanel)
    await useChatStore().ask('Oi')
    first.unmount()

    const second = mount(AkChatPanel)

    expect(second.find('.chat-question').text()).toBe('Oi')
    expect(second.find('.chat-answer-text').text()).toBe('Sim.')
  })

  it('rola a pergunta mais nova para a vista dentro do painel', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    vi.stubGlobal('fetch', reply({ answer: 'Sim.', found: true, sources: [] }))
    const wrapper = mount(AkChatPanel)

    await useChatStore().ask('Oi')
    await vi.waitFor(() => expect(wrapper.find('.chat-answer-text').exists()).toBe(true))

    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: 'end' }))
    expect(scrollIntoView.mock.calls.length).toBeGreaterThanOrEqual(2)
    delete (Element.prototype as Partial<Element>).scrollIntoView
  })

  it('mostra "Procurando a resposta" como texto solto, sem balão, enquanto espera', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    const wrapper = mount(AkChatPanel)

    void useChatStore().ask('Oi')
    await vi.waitFor(() => expect(wrapper.find('.chat-answer').exists()).toBe(true))

    const answer = wrapper.find('.chat-answer')
    expect(answer.classes()).toContain('plain')
    expect(answer.find('[role="status"]').text()).toContain('Procurando a resposta')
    expect(answer.find('.loading-dots').exists()).toBe(true)
  })
})
