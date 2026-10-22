import { describe, it, expect, vi, afterEach } from 'vitest'
import { analyze, upload } from '../documents'

const file = (name: string) => new File(['conteudo'], name, { type: 'application/pdf' })

describe('documents service', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('analisa um arquivo e mapeia a sugestão para camelCase', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        title: 'Manual',
        description: 'Descrição',
        suggested_category_id: 2,
        confidence: 0.87,
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await analyze(file('manual.pdf'))

    expect(result).toEqual({
      title: 'Manual',
      description: 'Descrição',
      suggestedCategoryId: 2,
      confidence: 0.87,
    })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v1/documents/analyze')
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(FormData)
  })

  it('rejeita com o código e a mensagem do servidor quando a análise falha', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 415,
      json: async () => ({ code: 'UNSUPPORTED_FORMAT', message: 'Formato não suportado.' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(analyze(file('planilha.xyz'))).rejects.toMatchObject({
      status: 415,
      message: 'Formato não suportado.',
    })
  })

  it('usa uma mensagem padrão quando o servidor não devolve uma', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => null,
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(analyze(file('manual.pdf'))).rejects.toMatchObject({
      status: 503,
      message: 'O serviço de classificação está indisponível. Preencha os campos manualmente.',
    })
  })

  it('envia o arquivo e os campos preenchidos', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)

    await upload({
      file: file('manual.pdf'),
      categoryId: 2,
      name: 'Manual',
      description: '',
      suggestedCategoryId: 2,
      categoryConfidence: 0.87,
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v1/documents')
    expect(url).not.toContain('/analyze')
    const body = init.body as FormData
    expect(body.get('categoryId')).toBe('2')
    expect(body.get('name')).toBe('Manual')
    expect(body.get('suggestedCategoryId')).toBe('2')
    expect(body.get('categoryConfidence')).toBe('0.87')
    expect(body.get('description')).toBeNull()
  })

  it('rejeita o envio com a mensagem do servidor', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ code: 'CONVERSION_REJECTED', message: 'Não foi possível converter.' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      upload({
        file: file('manual.docx'),
        categoryId: 1,
        name: 'Manual',
        description: '',
        suggestedCategoryId: null,
        categoryConfidence: null,
      }),
    ).rejects.toMatchObject({ status: 422, message: 'Não foi possível converter.' })
  })
})
