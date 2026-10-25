import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ReviewDetailPage from '../review/[id].vue'
import { usePendingStore } from '@/stores/pending-store'
import { approveDocument, rejectDocument } from '@/services/document-review'
import { fetchCategories } from '@/services/search'

const push = vi.fn()

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRouter: () => ({ push }),
  useRoute: () => ({ params: { id: '12' } }),
}))

vi.mock('@/services/document-review', () => ({
  approveDocument: vi.fn(),
  rejectDocument: vi.fn(),
}))

vi.mock('@/services/document-viewer', () => ({
  fetchDocumentPreview: vi.fn(() => new Promise(() => {})),
  fetchDocumentPage: vi.fn(() => new Promise(() => {})),
}))

vi.mock('@/services/search', () => ({
  fetchCategories: vi.fn(),
}))

const PENDING_DOCUMENT = {
  id: 12,
  name: 'manual-vpn.pdf',
  description: 'Como configurar a VPN',
  creatorName: 'Mariana Costa',
  sectorName: 'Engenharia',
  submittedAt: new Date('2026-10-13T19:06:15.123Z'),
  categoryId: 1,
  suggestedCategory: 'Tecnico',
  suggestedCategoryId: 1,
  confidence: 0.87,
  lowConfidence: false,
}

const CATEGORIES = [
  { id: 1, name: 'Tecnico', description: null },
  { id: 2, name: 'Regulatorio', description: null },
]

describe('review detail page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    push.mockClear()
    vi.mocked(approveDocument).mockReset().mockResolvedValue(undefined)
    vi.mocked(rejectDocument).mockReset().mockResolvedValue(undefined)
    vi.mocked(fetchCategories).mockResolvedValue(CATEGORIES)
  })

  it('diz que o documento não está mais na fila quando ele não é encontrado', async () => {
    const store = usePendingStore()
    store.status = 'done'
    store.pendingDocuments = []

    const wrapper = mount(ReviewDetailPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Este documento não está mais na fila de revisão.')
  })

  it('preenche o formulário com o nome, a descrição e a categoria enviados', async () => {
    const store = usePendingStore()
    store.status = 'done'
    store.pendingDocuments = [PENDING_DOCUMENT]

    const wrapper = mount(ReviewDetailPage)
    await flushPromises()

    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('manual-vpn.pdf')
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe(
      'Como configurar a VPN',
    )
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('1')
  })

  it('mantém a categoria do autor quando ela difere da sugestão', async () => {
    const store = usePendingStore()
    store.status = 'done'
    store.pendingDocuments = [{ ...PENDING_DOCUMENT, categoryId: 2 }]
    vi.spyOn(store, 'load').mockResolvedValue()

    const wrapper = mount(ReviewDetailPage)
    await flushPromises()

    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('2')
    expect(wrapper.text()).toContain('Sugestão: Tecnico')

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Aprovar')!
      .trigger('click')
    await flushPromises()

    expect(approveDocument).toHaveBeenCalledWith(12, {})
  })

  it('apaga a descrição quando o aprovador a deixa em branco', async () => {
    const store = usePendingStore()
    store.status = 'done'
    store.pendingDocuments = [PENDING_DOCUMENT]
    vi.spyOn(store, 'load').mockResolvedValue()

    const wrapper = mount(ReviewDetailPage)
    await flushPromises()

    await wrapper.get('textarea').setValue('  ')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Aprovar')!
      .trigger('click')
    await flushPromises()

    expect(approveDocument).toHaveBeenCalledWith(12, { description: '' })
  })

  it('aprova enviando só o que mudou e volta para a lista', async () => {
    const store = usePendingStore()
    store.status = 'done'
    store.pendingDocuments = [PENDING_DOCUMENT]
    const loadSpy = vi.spyOn(store, 'load').mockResolvedValue()

    const wrapper = mount(ReviewDetailPage)
    await flushPromises()

    await wrapper.get('textarea').setValue('revisado pelo aprovador')
    await wrapper.get('select').setValue('2')
    const approveButton = wrapper.findAll('button').find((b) => b.text() === 'Aprovar')
    await approveButton!.trigger('click')
    await flushPromises()

    expect(approveDocument).toHaveBeenCalledWith(12, {
      description: 'revisado pelo aprovador',
      categoryId: 2,
    })
    expect(loadSpy).toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith('/review')
  })

  it('exige um comentário para devolver o documento', async () => {
    const store = usePendingStore()
    store.status = 'done'
    store.pendingDocuments = [PENDING_DOCUMENT]
    vi.spyOn(store, 'load').mockResolvedValue()

    const wrapper = mount(ReviewDetailPage)
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Rejeitar')!
      .trigger('click')
    const confirmButton = wrapper.findAll('button').find((b) => b.text() === 'Devolver')
    expect(confirmButton!.attributes('disabled')).toBeDefined()

    await wrapper.get('.reject-modal textarea').setValue('Falta revisão')
    await confirmButton!.trigger('click')
    await flushPromises()

    expect(rejectDocument).toHaveBeenCalledWith(12, 'Falta revisão')
    expect(push).toHaveBeenCalledWith('/review')
  })
})

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
}
