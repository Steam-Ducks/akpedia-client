import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CATEGORIES, preAnalyzeDocument, submitDocument } from '../upload'

const file = (name: string) => new File(['conteudo'], name, { type: 'application/pdf' })

describe('upload service (mock)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('expõe as 4 categorias do catálogo', () => {
    expect(CATEGORIES).toHaveLength(4)
    expect(CATEGORIES.map((category) => category.name)).toEqual([
      'Tecnico',
      'Regulatorio',
      'Juridico',
      'Qualidade',
    ])
  })

  it('sugere uma categoria e reporta o progresso para um formato aceito', async () => {
    const onProgress = vi.fn()
    const promise = preAnalyzeDocument(file('manual.pdf'), onProgress)
    await vi.runAllTimersAsync()
    const result = await promise

    expect(onProgress).toHaveBeenCalledWith(100)
    expect(CATEGORIES.map((category) => category.id)).toContain(result.suggestedCategoryId)
    expect(result.name).toBe('manual')
    expect(result.categoryConfidence).not.toBeNull()
  })

  it('rejeita um formato não suportado', async () => {
    const promise = preAnalyzeDocument(file('planilha.xyz'))
    const assertion = expect(promise).rejects.toThrow(/Formato não suportado/)
    await vi.runAllTimersAsync()
    await assertion
  })

  it('rejeita o envio sem nome', async () => {
    const promise = submitDocument({
      documentId: 1,
      categoryId: 1,
      name: '   ',
      description: '',
      revision: '',
      author: '',
      documentDate: '2026-10-01',
    })
    const assertion = expect(promise).rejects.toThrow('Informe um nome para o documento.')
    await vi.runAllTimersAsync()
    await assertion
  })

  it('aceita o envio preenchido', async () => {
    const promise = submitDocument({
      documentId: 1,
      categoryId: 1,
      name: 'Manual',
      description: '',
      revision: '',
      author: '',
      documentDate: '2026-10-01',
    })
    await vi.runAllTimersAsync()
    await expect(promise).resolves.toBeUndefined()
  })
})
