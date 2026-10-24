import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AkPaginator from '../AkPaginator.vue'

describe('AkPaginator', () => {
  it('renders nothing with a single page', () => {
    const wrapper = mount(AkPaginator, { props: { page: 0, totalPages: 1 } })

    expect(wrapper.find('.ak-paginator').exists()).toBe(false)
  })

  it('shows the one-based page and the total', () => {
    const wrapper = mount(AkPaginator, { props: { page: 1, totalPages: 3 } })

    expect(wrapper.text()).toContain('Página 2 de 3')
  })

  it('disables going back from the first page', () => {
    const wrapper = mount(AkPaginator, { props: { page: 0, totalPages: 3 } })

    const buttons = wrapper.findAll('button')
    expect(buttons[0].attributes('disabled')).toBeDefined()
    expect(buttons[1].attributes('disabled')).toBeUndefined()
  })

  it('disables going forward from the last page', () => {
    const wrapper = mount(AkPaginator, { props: { page: 2, totalPages: 3 } })

    const buttons = wrapper.findAll('button')
    expect(buttons[0].attributes('disabled')).toBeUndefined()
    expect(buttons[1].attributes('disabled')).toBeDefined()
  })

  it('emits change with the next or previous page', async () => {
    const wrapper = mount(AkPaginator, { props: { page: 1, totalPages: 3 } })

    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')

    expect(wrapper.emitted('change')).toEqual([[0], [2]])
  })
})
