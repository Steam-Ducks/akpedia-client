import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCpfStore } from '../cpf-store'
import { fetchAccountStatus } from '@/services/account'
import { refreshSession } from '@/services/auth'

vi.mock('@/services/account', () => ({ fetchAccountStatus: vi.fn() }))
vi.mock('@/services/auth', () => ({ refreshSession: vi.fn() }))

describe('cpf store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('takes the problem from the account status', async () => {
    vi.mocked(fetchAccountStatus).mockResolvedValue({ cpfProblem: 'invalid_cpf' })
    const store = useCpfStore()

    await store.check()

    expect(store.problem).toBe('invalid_cpf')
  })

  it('keeps what it knows when the status cannot be read', async () => {
    vi.mocked(fetchAccountStatus).mockRejectedValue(new Error('HTTP 502'))
    const store = useCpfStore()
    store.refused('cpf_taken')

    await store.check()

    expect(store.problem).toBe('cpf_taken')
    expect(store.checking).toBe(false)
  })

  it('checks again with a renewed token, clearing the problem once the CPF is fixed', async () => {
    vi.mocked(fetchAccountStatus).mockResolvedValue({ cpfProblem: null })
    const store = useCpfStore()
    store.refused('invalid_cpf')

    await store.recheck()

    expect(refreshSession).toHaveBeenCalledOnce()
    expect(store.problem).toBeNull()
  })
})
