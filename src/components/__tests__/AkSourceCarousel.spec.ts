import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AkSourceCarousel from '../AkSourceCarousel.vue'

const sources = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    document_id: i + 1,
    name: `Documento ${i + 1}`,
    category: 'Tecnico',
  }))

const rowSizes = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('.source-row').map((row) => row.findAll('.source-card').length)

describe('AkSourceCarousel', () => {
  it('põe até 5 fontes numa fileira, sem "ver mais"', () => {
    const wrapper = mount(AkSourceCarousel, { props: { sources: sources(5) } })

    expect(rowSizes(wrapper)).toEqual([5])
    expect(wrapper.find('.more-button').exists()).toBe(false)
  })

  it('mostra só a primeira fileira e conta as fontes que sobram', () => {
    const wrapper = mount(AkSourceCarousel, { props: { sources: sources(8) } })

    expect(rowSizes(wrapper)).toEqual([5])
    expect(wrapper.find('.more-button').text()).toBe('Ver mais (3)')
    expect(wrapper.find('.more-button').attributes('aria-expanded')).toBe('false')
  })

  it('"Ver mais" abre o resto em novas fileiras de 5, e "Ver menos" volta a uma', async () => {
    const wrapper = mount(AkSourceCarousel, { props: { sources: sources(12) } })

    await wrapper.find('.more-button').trigger('click')

    expect(rowSizes(wrapper)).toEqual([5, 5, 2])
    expect(wrapper.find('.more-button').text()).toBe('Ver menos')
    expect(wrapper.find('.more-button').attributes('aria-expanded')).toBe('true')

    await wrapper.find('.more-button').trigger('click')

    expect(rowSizes(wrapper)).toEqual([5])
    await vi.waitFor(() => expect(wrapper.emitted('toggle')).toEqual([[true], [false]]))
  })
})
