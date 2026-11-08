import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useTermsStore } from '../terms-store'
import { acceptTerms, declineTerms, fetchTerms, TermsChangedError } from '@/services/terms'
import type { TermsVersion } from '@/types/Terms'

vi.mock('@/services/terms', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/terms')>()),
  fetchTerms: vi.fn(),
  acceptTerms: vi.fn(),
  declineTerms: vi.fn(),
}))

const version = (number: string): TermsVersion => ({
  version: number,
  title: 'Termos de uso',
  content: `Texto da versão ${number}.`,
  publishedAt: new Date('2026-11-06T12:00:00Z'),
  publishedBy: 'Admin Akpedia',
})

const acceptance = (number: string) => ({ version: number, acceptedAt: new Date() })

describe('terms store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('has nothing to accept while no terms were published', async () => {
    vi.mocked(fetchTerms).mockResolvedValue({ current: null, accepted: null })

    const store = useTermsStore()
    await store.load()

    expect(store.status).toBe('done')
    expect(store.pending).toBe(false)
  })

  it('asks for the current version when it was never accepted', async () => {
    vi.mocked(fetchTerms).mockResolvedValue({ current: version('1.0'), accepted: null })

    const store = useTermsStore()
    await store.load()

    expect(store.pending).toBe(true)
  })

  it('asks again when the accepted version is older than the current one', async () => {
    vi.mocked(fetchTerms).mockResolvedValue({
      current: version('2.0'),
      accepted: acceptance('1.0'),
    })

    const store = useTermsStore()
    await store.load()

    expect(store.pending).toBe(true)
  })

  it('is no longer pending once the current version is accepted', async () => {
    vi.mocked(fetchTerms).mockResolvedValue({
      current: version('2.0'),
      accepted: acceptance('1.0'),
    })
    vi.mocked(acceptTerms).mockResolvedValue(acceptance('2.0'))
    const store = useTermsStore()
    await store.load()

    await store.accept()

    expect(acceptTerms).toHaveBeenCalledWith('2.0')
    expect(store.pending).toBe(false)
    expect(store.error).toBeNull()
  })

  it('shows the newer version when the terms changed while being read', async () => {
    vi.mocked(fetchTerms).mockResolvedValueOnce({ current: version('1.0'), accepted: null })
    const store = useTermsStore()
    await store.load()

    vi.mocked(acceptTerms).mockRejectedValue(new TermsChangedError('A versão atual é a 2.'))
    vi.mocked(fetchTerms).mockResolvedValueOnce({ current: version('2.0'), accepted: null })
    await store.accept()

    expect(store.current?.version).toBe('2.0')
    expect(store.pending).toBe(true)
    expect(store.error).toBe('Os termos mudaram enquanto você lia. Confira a nova versão.')
  })

  it('keeps the terms on screen when accepting fails', async () => {
    vi.mocked(fetchTerms).mockResolvedValue({ current: version('1.0'), accepted: null })
    vi.mocked(acceptTerms).mockRejectedValue(new Error('Falhou.'))
    const store = useTermsStore()
    await store.load()

    await store.accept()

    expect(store.pending).toBe(true)
    expect(store.error).toBe('Falhou.')
    expect(store.accepting).toBe(false)
  })

  it('reports a failed first load', async () => {
    vi.mocked(fetchTerms).mockRejectedValue(new Error('Sem conexão.'))

    const store = useTermsStore()
    await store.load()

    expect(store.status).toBe('error')
    expect(store.error).toBe('Sem conexão.')
  })

  it('records the refusal of the version on screen', async () => {
    vi.mocked(fetchTerms).mockResolvedValue({ current: version('4.0'), accepted: null })
    const store = useTermsStore()
    await store.load()

    await store.decline()

    expect(declineTerms).toHaveBeenCalledWith('4.0')
  })

  it('fails when the refusal cannot be recorded', async () => {
    vi.mocked(fetchTerms).mockResolvedValue({ current: version('4.0'), accepted: null })
    vi.mocked(declineTerms).mockRejectedValue(new Error('Sem conexão.'))
    const store = useTermsStore()
    await store.load()

    await expect(store.decline()).rejects.toThrow('Sem conexão.')
  })
})
