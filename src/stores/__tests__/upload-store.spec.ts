import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUploadStore } from '../upload-store'
import { analyze, upload, DocumentApiError } from '@/services/documents'
import { fetchCategories } from '@/services/search'
import type { Analysis } from '@/types/Upload'

vi.mock('@/services/documents', async () => {
  const actual =
    await vi.importActual<typeof import('@/services/documents')>('@/services/documents')
  return {
    ...actual,
    analyze: vi.fn(),
    upload: vi.fn(),
  }
})

vi.mock('@/services/search', () => ({
  fetchCategories: vi.fn(),
}))

const file = new File(['conteudo'], 'manual.pdf', { type: 'application/pdf' })

const analysis = (overrides: Partial<Analysis> = {}): Analysis => ({
  title: 'manual',
  description: 'desc',
  suggestedCategoryId: 2,
  confidence: 0.87,
  ...overrides,
})

describe('upload store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('carrega o catálogo de categorias', async () => {
    vi.mocked(fetchCategories).mockResolvedValue([{ id: 1, name: 'Tecnico', description: null }])

    const store = useUploadStore()
    await store.loadCategories()

    expect(store.categories).toEqual([{ id: 1, name: 'Tecnico', description: null }])
  })

  it('analisa o arquivo e preenche a sugestão', async () => {
    vi.mocked(analyze).mockResolvedValue(analysis())

    const store = useUploadStore()
    await store.analyze(file)

    expect(analyze).toHaveBeenCalledWith(file)
    expect(store.status).toBe('review')
    expect(store.categoryId).toBe(2)
    expect(store.suggestedCategoryId).toBe(2)
    expect(store.categoryConfidence).toBe(0.87)
    expect(store.name).toBe('manual')
    expect(store.description).toBe('desc')
  })

  it('volta para idle e guarda o erro quando a análise falha', async () => {
    vi.mocked(analyze).mockRejectedValue(new DocumentApiError(415, 'Formato não suportado.'))

    const store = useUploadStore()
    await store.analyze(file)

    expect(store.status).toBe('idle')
    expect(store.error).toBe('Formato não suportado.')
  })

  it('com o classificador indisponível, segue para revisão com os campos vazios', async () => {
    vi.mocked(analyze).mockRejectedValue(
      new DocumentApiError(503, 'O serviço de classificação está indisponível.'),
    )

    const store = useUploadStore()
    await store.analyze(file)

    expect(store.status).toBe('review')
    expect(store.error).toBe('O serviço de classificação está indisponível.')
    expect(store.categoryId).toBeNull()
    expect(store.name).toBe('')
  })

  it('submete o documento preenchido', async () => {
    vi.mocked(analyze).mockResolvedValue(analysis())
    vi.mocked(upload).mockResolvedValue(undefined)

    const store = useUploadStore()
    await store.analyze(file)
    await store.submit()

    expect(upload).toHaveBeenCalledWith({
      file,
      categoryId: 2,
      name: 'manual',
      description: 'desc',
      suggestedCategoryId: 2,
      categoryConfidence: 0.87,
    })
    expect(store.status).toBe('submitted')
  })

  it('volta para revisão e guarda o erro quando o envio falha', async () => {
    vi.mocked(analyze).mockResolvedValue(analysis())
    vi.mocked(upload).mockRejectedValue(new Error('O envio falhou.'))

    const store = useUploadStore()
    await store.analyze(file)
    await store.submit()

    expect(store.status).toBe('review')
    expect(store.error).toBe('O envio falhou.')
  })

  it('reset limpa o estado', async () => {
    vi.mocked(analyze).mockResolvedValue(analysis())

    const store = useUploadStore()
    await store.analyze(file)
    store.reset()

    expect(store.status).toBe('idle')
    expect(store.file).toBeNull()
    expect(store.categoryId).toBeNull()
    expect(store.name).toBe('')
  })
})
