import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AkChip from '../AkChip.vue'

describe('AkChip', () => {
  it('renders its slot content', () => {
    const wrapper = mount(AkChip, { slots: { default: 'Engenharia' } })

    expect(wrapper.text()).toBe('Engenharia')
  })

  it('is not selected by default', () => {
    const wrapper = mount(AkChip)

    expect(wrapper.classes()).not.toContain('selected')
    expect(wrapper.attributes('aria-pressed')).toBe('false')
  })

  it('carries the selected class and aria-pressed when selected', () => {
    const wrapper = mount(AkChip, { props: { selected: true } })

    expect(wrapper.classes()).toContain('selected')
    expect(wrapper.attributes('aria-pressed')).toBe('true')
  })

  it('emits click when pressed', async () => {
    const wrapper = mount(AkChip)

    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('is a button of type "button", so it never submits a form by itself', () => {
    const wrapper = mount(AkChip)

    expect(wrapper.attributes('type')).toBe('button')
  })

  it('defaults to the dark theme, for a colored backdrop', () => {
    const wrapper = mount(AkChip)

    expect(wrapper.classes()).toContain('dark')
    expect(wrapper.classes()).not.toContain('light')
  })

  it('carries the light theme when asked, for a plain background', () => {
    const wrapper = mount(AkChip, { props: { theme: 'light' } })

    expect(wrapper.classes()).toContain('light')
    expect(wrapper.classes()).not.toContain('dark')
  })
})
