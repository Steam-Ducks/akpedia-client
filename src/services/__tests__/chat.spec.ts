import { describe, it, expect, vi, afterEach } from 'vitest'
import { askQuestion, ChatUnavailableError, stripPassageMarkers } from '../chat'

describe('chat service', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('envia a pergunta ao chat e devolve a resposta', async () => {
    const body = {
      answer: 'Em até 7 dias [1].',
      found: true,
      sources: [{ document_id: 42, name: 'Manual', category: 'Financeiro' }],
    }
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => body })
    vi.stubGlobal('fetch', fetchMock)

    const result = await askQuestion('Qual o prazo?')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/api/v1/chat')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ question: 'Qual o prazo?' })
    expect(result).toEqual(body)
  })

  it('falha com ChatUnavailableError quando o assistente está fora do ar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({ code: 'chat_unavailable', message: 'x' }),
      }),
    )

    await expect(askQuestion('Oi')).rejects.toBeInstanceOf(ChatUnavailableError)
  })

  it('falha com a mensagem do servidor nos outros erros', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ code: 'invalid_request', message: 'Pergunta inválida' }),
      }),
    )

    await expect(askQuestion('Oi')).rejects.toThrow('Pergunta inválida')
  })

  it('remove os marcadores [n] da resposta', () => {
    expect(stripPassageMarkers('O prazo é de 7 dias [1]. Vale para todos [2][3].')).toBe(
      'O prazo é de 7 dias. Vale para todos.',
    )
    expect(stripPassageMarkers('Texto [1, 2] fim')).toBe('Texto fim')
  })
})
