import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AkAccordion from '../AkAccordion.vue'

describe('AkAccordion', () => {
  it('starts closed, with its content hidden', () => {
    const wrapper = mount(AkAccordion, {
      props: { title: 'Categorias' },
      slots: { default: '<p>conteúdo</p>' },
    })

    expect(wrapper.text()).toContain('Categorias')
    expect(wrapper.find('.ak-accordion-content').exists()).toBe(false)
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
  })

  it('opens its content when the header is clicked, and closes again on a second click', async () => {
    const wrapper = mount(AkAccordion, {
      props: { title: 'Categorias' },
      slots: { default: '<p>conteúdo</p>' },
    })

    await wrapper.get('button').trigger('click')
    expect(wrapper.find('.ak-accordion-content').exists()).toBe(true)
    expect(wrapper.text()).toContain('conteúdo')
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('true')

    await wrapper.get('button').trigger('click')
    expect(wrapper.find('.ak-accordion-content').exists()).toBe(false)
  })
})
