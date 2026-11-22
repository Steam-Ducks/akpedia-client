import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AkSegmentedControl from '../AkSegmentedControl.vue'

const options = [
  { value: 'search', label: 'Busca' },
  { value: 'chat', label: 'Chat' },
]

const mountControl = (modelValue: string) =>
  mount(AkSegmentedControl, {
    props: { options, label: 'Modo', modelValue, 'onUpdate:modelValue': () => {} },
    attachTo: document.body,
  })

describe('AkSegmentedControl', () => {
  it('é um radiogroup com a opção atual marcada', () => {
    const wrapper = mountControl('chat')

    expect(wrapper.attributes('role')).toBe('radiogroup')
    const radios = wrapper.findAll('[role="radio"]')
    expect(radios.map((r) => r.attributes('aria-checked'))).toEqual(['false', 'true'])
  })

  it('emite o valor ao clicar numa opção', async () => {
    const wrapper = mountControl('search')

    await wrapper.findAll('[role="radio"]')[1].trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['chat'])
  })

  it('as setas movem entre as opções, dando a volta', async () => {
    const wrapper = mountControl('search')
    const radios = wrapper.findAll('[role="radio"]')

    await radios[0].trigger('keydown', { key: 'ArrowRight' })
    await radios[0].trigger('keydown', { key: 'ArrowLeft' })

    expect(wrapper.emitted('update:modelValue')).toEqual([['chat'], ['chat']])
  })
})
