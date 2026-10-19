import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CategoryChips from '../CategoryChips.vue'

const categories = [
  { id: 1, name: 'Engenharia', description: null },
  { id: 2, name: 'Normativa', description: null },
]

describe('CategoryChips', () => {
  it('renders one chip per category, marking the selected ones', () => {
    const wrapper = mount(CategoryChips, {
      props: { categories, selectedIds: [2] },
    })

    const chips = wrapper.findAll('.ak-chip')
    expect(chips).toHaveLength(2)
    expect(chips[0].classes()).not.toContain('selected')
    expect(chips[1].classes()).toContain('selected')
  })

  it('emits toggle with the clicked category id', async () => {
    const wrapper = mount(CategoryChips, {
      props: { categories, selectedIds: [] },
    })

    await wrapper.findAll('.ak-chip')[1].trigger('click')

    expect(wrapper.emitted('toggle')).toEqual([[2]])
  })
})
