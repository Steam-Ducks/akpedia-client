import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import UploadPage from '../upload.vue'
import { useUploadStore } from '@/stores/upload-store'

describe('upload page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('lista as 4 categorias com a sugerida selecionada', async () => {
    const store = useUploadStore()
    store.documentId = 1
    store.categoryId = 2
    store.categoryConfidence = 0.87
    store.description = 'Manual de manutenção'
    store.status = 'review'

    const wrapper = mount(UploadPage)
    await wrapper.vm.$nextTick()

    const options = wrapper.findAll('select option')
    expect(options.map((option) => option.text())).toEqual([
      'Tecnico',
      'Regulatorio',
      'Juridico',
      'Qualidade',
    ])
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('2')
    expect(wrapper.text()).toContain('Sugestão com 87% de confiança')
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe(
      'Manual de manutenção',
    )
  })

  it('atualiza a categoria escolhida', async () => {
    const store = useUploadStore()
    store.documentId = 1
    store.categoryId = 2
    store.status = 'review'

    const wrapper = mount(UploadPage)
    await wrapper.get('select').setValue(4)

    expect(store.categoryId).toBe(4)
  })
})
