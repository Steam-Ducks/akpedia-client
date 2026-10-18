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
      expect(wrapper.findAll('.category-chip')).toHaveLength(2)
    })
    expect(wrapper.text()).toContain('Engenharia')
    expect(wrapper.text()).toContain('Normativa')
  })

  it('alterna a seleção de uma categoria ao clicar no chip', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => categories }))

    const wrapper = mount(AkSearchbox)
    await vi.waitFor(() => expect(wrapper.findAll('.category-chip')).toHaveLength(2))

    const store = useResultStore()
    await wrapper.find('.category-chip').trigger('click')

    expect(store.categoryIds).toEqual([1])
    expect(wrapper.find('.category-chip').classes()).toContain('selected')
  })

  it('o botão de busca fica habilitado com apenas uma categoria selecionada, sem texto', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => categories }))

    const wrapper = mount(AkSearchbox)
    await vi.waitFor(() => expect(wrapper.findAll('.category-chip')).toHaveLength(2))

    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()

    await wrapper.find('.category-chip').trigger('click')

    await vi.waitFor(() => {
      expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    })
  })

  it('submete a busca com o texto e as categorias selecionadas', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => categories })

    const wrapper = mount(AkSearchbox)
    await vi.waitFor(() => expect(wrapper.findAll('.category-chip')).toHaveLength(2))
    await wrapper.find('.category-chip').trigger('click')

    const callsBeforeSubmit = fetchMock.mock.calls.length
    await wrapper.get('input').setValue('manual')
    await wrapper.get('form').trigger('submit')

    await vi.waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBeforeSubmit))
    const url = new URL(fetchMock.mock.calls.at(-1)![0], 'http://localhost')
    expect(url.pathname).toBe('/api/v1/search')
    expect(url.searchParams.get('q')).toBe('manual')
    expect(url.searchParams.getAll('categoryIds')).toEqual(['1'])
  })
})
