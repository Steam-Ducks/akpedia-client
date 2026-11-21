import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AkDatePicker from '../AkDatePicker.vue'

const mountPicker = (props: Record<string, unknown> = {}) =>
  mount(AkDatePicker, {
    props: { modelValue: '', 'onUpdate:modelValue': () => {}, ...props },
    attachTo: document.body,
  })

const lastEmitted = (wrapper: ReturnType<typeof mountPicker>) =>
  wrapper.emitted('update:modelValue')?.at(-1)?.[0]

describe('AkDatePicker', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 10, 20, 10))
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('mostra a data no formato brasileiro, ou o placeholder sem data', () => {
    expect(mountPicker().get('.ak-date-trigger').text()).toBe('dd/mm/aaaa')
    expect(mountPicker({ modelValue: '2026-11-03' }).get('.ak-date-trigger').text()).toBe(
      '03/11/2026',
    )
  })

  it('abre no mês da data escolhida, com o dia marcado', async () => {
    const wrapper = mountPicker({ modelValue: '2026-02-14' })

    await wrapper.get('.ak-date-trigger').trigger('click')

    expect(wrapper.get('.ak-date-month').text()).toBe('fevereiro de 2026')
    expect(wrapper.get('.ak-date-day.selected').attributes('data-date')).toBe('2026-02-14')
    expect(wrapper.get('[tabindex="0"]').attributes('data-date')).toBe('2026-02-14')
  })

  it('sem data, abre no mês atual com hoje destacado', async () => {
    const wrapper = mountPicker()

    await wrapper.get('.ak-date-trigger').trigger('click')

    expect(wrapper.get('.ak-date-month').text()).toBe('novembro de 2026')
    expect(wrapper.get('.ak-date-day.today').attributes('data-date')).toBe('2026-11-20')
    expect(wrapper.findAll('.ak-date-day')).toHaveLength(42)
  })

  it('emite o dia clicado no formato do input e fecha', async () => {
    const wrapper = mountPicker()
    await wrapper.get('.ak-date-trigger').trigger('click')

    await wrapper.get('[data-date="2026-11-05"]').trigger('click')

    expect(lastEmitted(wrapper)).toBe('2026-11-05')
    expect(wrapper.find('.ak-date-popover').exists()).toBe(false)
  })

  it('troca de mês pelas setas do cabeçalho', async () => {
    const wrapper = mountPicker()
    await wrapper.get('.ak-date-trigger').trigger('click')

    await wrapper.get('.ak-date-nav.next').trigger('click')
    expect(wrapper.get('.ak-date-month').text()).toBe('dezembro de 2026')

    await wrapper.get('.ak-date-nav.previous').trigger('click')
    await wrapper.get('.ak-date-nav.previous').trigger('click')
    expect(wrapper.get('.ak-date-month').text()).toBe('outubro de 2026')
  })

  it('anda pelos dias com o teclado', async () => {
    const wrapper = mountPicker({ modelValue: '2026-11-30' })
    await wrapper.get('.ak-date-trigger').trigger('click')
    const grid = wrapper.get('.ak-date-grid')

    await grid.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.get('[tabindex="0"]').attributes('data-date')).toBe('2026-12-01')
    expect(wrapper.get('.ak-date-month').text()).toBe('dezembro de 2026')

    await grid.trigger('keydown', { key: 'ArrowUp' })
    expect(wrapper.get('[tabindex="0"]').attributes('data-date')).toBe('2026-11-24')

    await grid.trigger('keydown', { key: 'PageDown' })
    expect(wrapper.get('[tabindex="0"]').attributes('data-date')).toBe('2026-12-24')
  })

  it('desabilita os dias fora de min e max', async () => {
    const wrapper = mountPicker({ min: '2026-11-10', max: '2026-11-25' })
    await wrapper.get('.ak-date-trigger').trigger('click')

    expect(wrapper.get('[data-date="2026-11-09"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-date="2026-11-10"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-date="2026-11-26"]').attributes('disabled')).toBeDefined()

    await wrapper.get('[data-date="2026-11-09"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('Hoje e Limpar escolhem hoje e apagam a data', async () => {
    const wrapper = mountPicker({ modelValue: '2026-01-01' })

    await wrapper.get('.ak-date-trigger').trigger('click')
    await wrapper.get('.today-action').trigger('click')
    expect(lastEmitted(wrapper)).toBe('2026-11-20')

    await wrapper.get('.ak-date-trigger').trigger('click')
    await wrapper.get('.ak-date-action.clear').trigger('click')
    expect(lastEmitted(wrapper)).toBe('')
  })

  it('dentro de um label, um clique no cartão não fecha o calendário', async () => {
    const wrapper = mount(
      {
        components: { AkDatePicker },
        template: '<label>De <AkDatePicker model-value="" /></label>',
      },
      { attachTo: document.body },
    )
    await wrapper.get('.ak-date-trigger').trigger('click')

    ;(wrapper.get('.ak-date-month').element as HTMLElement).click()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.ak-date-popover').exists()).toBe(true)
  })

  it('fecha com Esc e com um clique fora', async () => {
    const wrapper = mountPicker()

    await wrapper.get('.ak-date-trigger').trigger('click')
    await wrapper.get('.ak-date-grid').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('.ak-date-popover').exists()).toBe(false)

    await wrapper.get('.ak-date-trigger').trigger('click')
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ak-date-popover').exists()).toBe(false)
  })
})
