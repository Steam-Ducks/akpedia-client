import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { REFRESH_INTERVAL_MS, useProfileRequestsStore } from '../profile-requests-store'
import { fetchProfileRequests } from '@/services/admin-profile-requests'

vi.mock('@/services/admin-profile-requests', () => ({ fetchProfileRequests: vi.fn() }))

const pending = (total: number) => ({
  content: [],
  page: 0,
  size: 1,
  totalElements: total,
  totalPages: total,
})

describe('profile requests store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    useProfileRequestsStore().stopWatching()
    vi.useRealTimers()
  })

  it('counts the pending requests now and again every minute', async () => {
    vi.mocked(fetchProfileRequests).mockResolvedValueOnce(pending(1)).mockResolvedValue(pending(2))
    const store = useProfileRequestsStore()

    store.watchPending()
    await flushPromises()
    expect(store.pendingCount).toBe(1)

    await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS)
    expect(store.pendingCount).toBe(2)
  })

  it('keeps the last count when the server cannot be reached', async () => {
    vi.mocked(fetchProfileRequests).mockRejectedValue(new Error('HTTP 502'))
    const store = useProfileRequestsStore()
    store.setPendingCount(4)

    await store.refresh()

    expect(store.pendingCount).toBe(4)
  })

  it('stops asking once stopped', async () => {
    vi.mocked(fetchProfileRequests).mockResolvedValue(pending(0))
    const store = useProfileRequestsStore()
    store.watchPending()
    store.stopWatching()
    vi.mocked(fetchProfileRequests).mockClear()

    await vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS * 2)

    expect(fetchProfileRequests).not.toHaveBeenCalled()
  })
})
