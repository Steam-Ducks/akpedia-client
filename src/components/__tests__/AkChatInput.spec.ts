import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AkChatInput from '../AkChatInput.vue'
import { useChatStore } from '@/stores/chat-store'

describe('AkChatInput', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.unstubAllGlobals()
  })

  it('limita a pergunta a 1000 caracteres', () => {
    const wrapper = mount(AkChatInput)

    expect(wrapper.find('textarea').attributes('maxlength')).toBe('1000')
  })

  it('só deixa perguntar com texto', async () => {
    const wrapper = mount(AkChatInput)
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()

    await wrapper.find('textarea').setValue('Oi')

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('envia a pergunta com Enter e limpa o campo', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ answer: 'Sim.', found: true, sources: [] }),
      }),
    )
    const wrapper = mount(AkChatInput)
    const store = useChatStore()

    await wrapper.find('textarea').setValue('Posso?')
    await wrapper.find('textarea').trigger('keydown', { key: 'Enter' })

    await vi.waitFor(() => expect(store.turns[0]?.status).toBe('done'))
    expect(store.turns[0].question).toBe('Posso?')
    expect(store.draft).toBe('')
  })

  it('não deixa perguntar de novo enquanto espera a resposta', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
    const wrapper = mount(AkChatInput)

    await wrapper.find('textarea').setValue('Oi')
    await wrapper.find('form').trigger('submit')
    await wrapper.find('textarea').setValue('Outra')

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })
})
