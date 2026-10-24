import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ReviewIndexPage from '../review/index.vue'
import { usePendingStore } from '@/stores/pending-store'

const push = vi.fn()

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRouter: () => ({ push }),
}))

vi.mock('@/services/pending-documents', () => ({
  fetchPendingDocuments: vi.fn(() => new Promise(() => {})),
}))

describe('review index page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    push.mockClear()
  })

  it('diz que não há nada para revisar quando a fila está vazia', async () => {
    const store = usePendingStore()
    store.status = 'done'
    store.pendingDocuments = []

    const wrapper = mount(ReviewIndexPage)
    await flushLoad()

    expect(wrapper.text()).toContain('Não há documentos pendentes de revisão.')
  })

  it('lista os pendentes com a categoria sugerida e a confiança', async () => {
    const store = usePendingStore()
    store.status = 'done'
    store.pendingDocuments = [
      {
        id: 12,
        name: 'manual-vpn.pdf',
        description: null,
        creatorName: 'Mariana Costa',
        sectorName: 'Engenharia',
        submittedAt: new Date(),
        suggestedCategory: 'Tecnico',
        categoryId: 1,
        suggestedCategoryId: 1,
        confidence: 0.87,
        lowConfidence: false,
      },
    ]

    const wrapper = mount(ReviewIndexPage)
    await flushLoad()

    expect(wrapper.text()).toContain('manual-vpn.pdf')
    expect(wrapper.text()).toContain('Tecnico')
    expect(wrapper.text()).toContain('87%')
  })

  it('aponta a sugestão de baixa confiança e abre a tela de revisão do documento', async () => {
    const store = usePendingStore()
    store.status = 'done'
    store.pendingDocuments = [
      {
        id: 15,
        name: 'politica-ferias.pdf',
        description: null,
        creatorName: 'Usuário padrão',
        sectorName: 'Administrativo',
        submittedAt: new Date(),
        suggestedCategory: 'Legal',
        categoryId: 3,
        suggestedCategoryId: 3,
        confidence: 0.4,
        lowConfidence: true,
      },
    ]

    const wrapper = mount(ReviewIndexPage)
    await flushLoad()

    expect(wrapper.find('.suggestion-badge--low').exists()).toBe(true)

    await wrapper.get('.pending-card').trigger('click')

    expect(push).toHaveBeenCalledWith('/review/15')
  })
})

async function flushLoad() {
  await Promise.resolve()
}
