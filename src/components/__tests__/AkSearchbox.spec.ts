import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AkSearchbox from '../AkSearchbox.vue'
import { useResultStore } from '@/stores/result-store'

const categories = [
  { id: 1, name: 'Engenharia', description: null },
  { id: 2, name: 'Normativa', description: null },
]

describe('AkSearchbox', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('carrega e lista as categorias ao montar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => categories }))

    const wrapper = mount(AkSearchbox)
    await vi.waitFor(() => {
      expect(wrapper.findAll('.ak-chip')).toHaveLength(2)
    })
    expect(wrapper.text()).toContain('Engenharia')
    expect(wrapper.text()).toContain('Normativa')
  })

  it('alterna a seleção de uma categoria ao clicar no chip', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => categories }))

    const wrapper = mount(AkSearchbox)
    await vi.waitFor(() => expect(wrapper.findAll('.ak-chip')).toHaveLength(2))

    const store = useResultStore()
    await wrapper.find('.ak-chip').trigger('click')

    expect(store.categoryIds).toEqual([1])
    expect(wrapper.find('.ak-chip').classes()).toContain('selected')
  })

  it('o botão de busca fica habilitado com apenas uma categoria selecionada, sem texto', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => categories }))

    const wrapper = mount(AkSearchbox)
    await vi.waitFor(() => expect(wrapper.findAll('.ak-chip')).toHaveLength(2))

    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()

    await wrapper.find('.ak-chip').trigger('click')

    await vi.waitFor(() => {
      expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    })
  })

  it('submete a busca com o texto e as categorias selecionadas', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => categories })

    const wrapper = mount(AkSearchbox)
    await vi.waitFor(() => expect(wrapper.findAll('.ak-chip')).toHaveLength(2))
    await wrapper.find('.ak-chip').trigger('click')

    const callsBeforeSubmit = fetchMock.mock.calls.length
    await wrapper.get('input').setValue('manual')
    await wrapper.get('form').trigger('submit')

    await vi.waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBeforeSubmit))
    const url = new URL(fetchMock.mock.calls.at(-1)![0], 'http://localhost')
    expect(url.pathname).toBe('/api/v1/search')
    expect(url.searchParams.get('q')).toBe('manual')
    expect(url.searchParams.getAll('categoryIds')).toEqual(['1'])
  })

  it('a versão completa mostra os chips de categoria direto, sem acordeão', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => categories }))

    const wrapper = mount(AkSearchbox)
    await vi.waitFor(() => expect(wrapper.findAll('.ak-chip')).toHaveLength(2))

    expect(wrapper.find('.ak-accordion').exists()).toBe(false)
  })

  it('a versão compacta esconde os chips de categoria dentro de um acordeão fechado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => categories }))

    const wrapper = mount(AkSearchbox, { props: { compact: true } })
    await vi.waitFor(() => expect(wrapper.find('.ak-accordion').exists()).toBe(true))

    expect(wrapper.findAll('.ak-chip')).toHaveLength(0)

    await wrapper.get('.ak-accordion-header').trigger('click')

    expect(wrapper.findAll('.ak-chip')).toHaveLength(2)
  })
})
