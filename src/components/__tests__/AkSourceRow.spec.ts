import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AkSourceRow from '../AkSourceRow.vue'

const sources = Array.from({ length: 5 }, (_, i) => ({
  document_id: i + 1,
  name: `Documento ${i + 1}`,
  category: 'Tecnico',
}))

describe('AkSourceRow', () => {
  it('mostra uma carta por fonte, reservando o espaço das setas', () => {
    const wrapper = mount(AkSourceRow, { props: { sources } })

    expect(wrapper.findAll('.source-card')).toHaveLength(5)
  })

  it('só ativa as setas quando as fontes não cabem, e rola ao clicar nelas', async () => {
    let resize: () => void = () => {}
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resize = callback
        }
        observe() {}
        disconnect() {}
      },
    )
    const wrapper = mount(AkSourceRow, { props: { sources } })
    expect(wrapper.findAll('.row-arrow')).toHaveLength(2)
    expect(wrapper.findAll('.row-arrow.inactive')).toHaveLength(2)

    const track = wrapper.find('.row-track').element as HTMLElement
    Object.defineProperty(track, 'scrollWidth', { value: 900, configurable: true })
    Object.defineProperty(track, 'clientWidth', { value: 400, configurable: true })
    const scrollBy = vi.fn()
    track.scrollBy = scrollBy
    resize()
    await wrapper.vm.$nextTick()

    const arrows = wrapper.findAll('.row-arrow')
    expect(wrapper.findAll('.row-arrow.inactive')).toHaveLength(0)
    await arrows[1].trigger('click')
    await arrows[0].trigger('click')
    expect(scrollBy.mock.calls[0][0].left).toBeGreaterThan(0)
    expect(scrollBy.mock.calls[1][0].left).toBeLessThan(0)
    vi.unstubAllGlobals()
  })
})
