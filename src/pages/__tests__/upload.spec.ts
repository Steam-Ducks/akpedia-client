import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import UploadPage from '../upload.vue'
import { useUploadStore } from '@/stores/upload-store'
import { fetchCategories } from '@/services/search'

vi.mock('@/services/search', () => ({
  fetchCategories: vi.fn(),
}))

const CATEGORIES = [
  { id: 1, name: 'Tecnico', description: null },
  { id: 2, name: 'Regulatorio', description: null },
]

describe('upload page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(fetchCategories).mockResolvedValue(CATEGORIES)
  })

  it('lista as categorias carregadas com a sugerida selecionada', async () => {
    const store = useUploadStore()
    store.categoryId = 2
    store.categoryConfidence = 0.87
    store.description = 'Manual de manutenção'
    store.status = 'review'

    const wrapper = mount(UploadPage)
    await flushCategories()

    const options = wrapper.findAll('select option:not([disabled])')
    expect(options.map((option) => option.text())).toEqual(['Tecnico', 'Regulatorio'])
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('2')
    expect(wrapper.text()).toContain('Sugestão com 87% de confiança')
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe(
      'Manual de manutenção',
    )
  })

  it('atualiza a categoria escolhida', async () => {
    const store = useUploadStore()
    store.categoryId = 2
    store.status = 'review'

    const wrapper = mount(UploadPage)
    await flushCategories()
    await wrapper.get('select').setValue(1)

    expect(store.categoryId).toBe(1)
  })
})

/** Lets the mocked `fetchCategories` promise resolve and the select re-render with its options. */
async function flushCategories() {
  await Promise.resolve()
  await nextTick()
}
