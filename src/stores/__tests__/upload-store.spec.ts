import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUploadStore } from '../upload-store'
import { preAnalyzeDocument, submitDocument } from '@/services/upload'
import type { PreAnalysis } from '@/types/Upload'

vi.mock('@/services/upload', () => ({
  CATEGORIES: [
    { id: 1, name: 'Tecnico' },
    { id: 2, name: 'Regulatorio' },
  ],
  preAnalyzeDocument: vi.fn(),
  submitDocument: vi.fn(),
}))

const file = new File(['conteudo'], 'manual.pdf', { type: 'application/pdf' })

const analysis = (overrides: Partial<PreAnalysis> = {}): PreAnalysis => ({
  documentId: 42,
  suggestedCategoryId: 2,
  categoryConfidence: 0.87,
  name: 'manual',
  description: 'desc',
  revision: 'Rev. A',
  author: 'ana',
  documentDate: '2026-10-01',
  ...overrides,
})

describe('upload store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('expõe o catálogo de categorias', () => {
    const store = useUploadStore()
    expect(store.categories).toHaveLength(2)
  })

  it('analisa o arquivo e preenche a sugestão', async () => {
    vi.mocked(preAnalyzeDocument).mockImplementation(async (_file, onProgress) => {
      onProgress?.(50)
      return analysis()
    })

    const store = useUploadStore()
    await store.analyze(file)

    expect(preAnalyzeDocument).toHaveBeenCalledWith(file, expect.any(Function))
    expect(store.status).toBe('review')
    expect(store.documentId).toBe(42)
    expect(store.categoryId).toBe(2)
    expect(store.categoryConfidence).toBe(0.87)
    expect(store.name).toBe('manual')
    expect(store.progress).toBe(50)
  })

  it('volta para idle e guarda o erro quando a análise falha', async () => {
    vi.mocked(preAnalyzeDocument).mockRejectedValue(new Error('Formato não suportado.'))

    const store = useUploadStore()
    await store.analyze(file)

    expect(store.status).toBe('idle')
    expect(store.error).toBe('Formato não suportado.')
  })

  it('submete o documento preenchido', async () => {
    vi.mocked(preAnalyzeDocument).mockResolvedValue(analysis({ name: 'manual', revision: '' }))
    vi.mocked(submitDocument).mockResolvedValue(undefined)

    const store = useUploadStore()
    await store.analyze(file)
    await store.submit()

    expect(submitDocument).toHaveBeenCalledWith({
      documentId: 42,
      categoryId: 2,
      name: 'manual',
      description: 'desc',
      revision: '',
      author: 'ana',
      documentDate: '2026-10-01',
    })
    expect(store.status).toBe('submitted')
  })

  it('mantém a revisão e guarda o erro quando o envio falha', async () => {
    vi.mocked(preAnalyzeDocument).mockResolvedValue(analysis({ name: '' }))
    vi.mocked(submitDocument).mockRejectedValue(new Error('Informe um nome para o documento.'))

    const store = useUploadStore()
    await store.analyze(file)
    await store.submit()

    expect(store.status).toBe('review')
    expect(store.error).toBe('Informe um nome para o documento.')
  })

  it('reset limpa o estado', async () => {
    vi.mocked(preAnalyzeDocument).mockResolvedValue(analysis())

    const store = useUploadStore()
    await store.analyze(file)
    store.reset()

    expect(store.status).toBe('idle')
    expect(store.documentId).toBeNull()
    expect(store.categoryId).toBeNull()
    expect(store.name).toBe('')
  })
})
