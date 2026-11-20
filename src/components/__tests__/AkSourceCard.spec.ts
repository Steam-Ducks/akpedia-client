import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AkSourceCard from '../AkSourceCard.vue'

const push = vi.fn()

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRouter: () => ({ push }),
}))

const source = { document_id: 42, name: 'Manual de Reembolso', category: 'Financeiro' }

describe('AkSourceCard', () => {
  it('mostra a categoria e o nome do documento', () => {
    const wrapper = mount(AkSourceCard, { props: { source } })

    expect(wrapper.find('.source-badge').text()).toBe('Financeiro')
    expect(wrapper.find('.source-title').text()).toBe('Manual de Reembolso')
    expect(wrapper.attributes('title')).toBe('Manual de Reembolso')
  })

  it('abre o documento no visualizador ao clicar', async () => {
    push.mockClear()
    const wrapper = mount(AkSourceCard, { props: { source } })

    await wrapper.trigger('click')

    expect(push).toHaveBeenCalledWith('/docs/42')
  })

  it('mostra descrição, quem enviou e a última atualização quando existem', () => {
    const wrapper = mount(AkSourceCard, {
      props: {
        source: {
          ...source,
          description: 'Prazos e regras de reembolso',
          responsible_name: 'Ana Souza',
          updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    })

    expect(wrapper.find('.source-description').text()).toBe('Prazos e regras de reembolso')
    expect(wrapper.find('.source-footer').text()).toContain('Ana Souza')
    expect(wrapper.find('.source-footer').text()).toContain('atualizado há 3 dias')
  })

  it('não mostra descrição nem rodapé quando só tem nome e categoria', () => {
    const wrapper = mount(AkSourceCard, { props: { source } })

    expect(wrapper.find('.source-description').exists()).toBe(false)
    expect(wrapper.find('.source-footer').exists()).toBe(false)
  })
})
