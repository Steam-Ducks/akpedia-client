import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAccountStore } from '../account-store'
import { useCpfStore } from '../cpf-store'
import { useTermsStore } from '../terms-store'
import { fetchAccountStatus } from '@/services/account'

vi.mock('@/services/account', () => ({ fetchAccountStatus: vi.fn() }))
vi.mock('@/services/auth', () => ({ refreshSession: vi.fn() }))

describe('account store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('hands what GET /me says to the terms and the CPF stores, in one call', async () => {
    vi.mocked(fetchAccountStatus).mockResolvedValue({ termsPending: true, cpfProblem: 'cpf_taken' })

    const store = useAccountStore()
    await store.load()

    expect(fetchAccountStatus).toHaveBeenCalledTimes(1)
    expect(store.status).toBe('done')
    expect(useTermsStore().pending).toBe(true)
    expect(useCpfStore().problem).toBe('cpf_taken')
  })

  it('reports a failed first load', async () => {
    vi.mocked(fetchAccountStatus).mockRejectedValue(new Error('Sem conexão.'))

    const store = useAccountStore()
    await store.load()

    expect(store.status).toBe('error')
    expect(store.error).toBe('Sem conexão.')
  })

  it('keeps the app open when a reload fails', async () => {
    vi.mocked(fetchAccountStatus).mockResolvedValueOnce({ termsPending: false, cpfProblem: null })
    const store = useAccountStore()
    await store.load()

    vi.mocked(fetchAccountStatus).mockRejectedValueOnce(new Error('Sem conexão.'))
    await store.load()

    expect(store.status).toBe('done')
  })
})
