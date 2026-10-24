import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AkStatusChip from '../AkStatusChip.vue'

describe('AkStatusChip', () => {
  it.each([
    ['UNDER_REVIEW', 'Em análise'],
    ['PROCESSING', 'Processando'],
    ['PUBLISHED', 'Publicado'],
    ['INDEXING_FAILED', 'Falha na indexação'],
    ['RETURNED', 'Devolvido'],
  ] as const)('labels %s as "%s"', (status, label) => {
    const wrapper = mount(AkStatusChip, { props: { status } })

    expect(wrapper.text()).toBe(label)
  })

  it('gives indexing failure and returned a distinct look from processing', () => {
    const failed = mount(AkStatusChip, { props: { status: 'INDEXING_FAILED' } })
    const returned = mount(AkStatusChip, { props: { status: 'RETURNED' } })
    const processing = mount(AkStatusChip, { props: { status: 'PROCESSING' } })

    expect(failed.classes()).toContain('alert')
    expect(returned.classes()).toContain('alert')
    expect(processing.classes()).not.toContain('alert')
  })
})
