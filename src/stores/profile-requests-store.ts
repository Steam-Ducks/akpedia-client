import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchProfileRequests } from '@/services/admin-profile-requests'

/** How often the admin's count of pending requests is refreshed while the app is open. */
export const REFRESH_INTERVAL_MS = 60_000

/**
 * How many e-mail/CPF change requests wait for an admin's decision: the badge in the sidebar,
 * so an admin notices a user who asked (a refused CPF keeps them out of the app until then).
 */
export const useProfileRequestsStore = defineStore('profile-requests', () => {
  const pendingCount = ref(0)

  let timer: ReturnType<typeof setInterval> | null = null

  /** Asks the server. A failure keeps the last count: the badge is only a reminder. */
  const refresh = async () => {
    try {
      pendingCount.value = (
        await fetchProfileRequests({ status: 'PENDING', size: 1 })
      ).totalElements
    } catch {
      // Kept as it was; the next refresh tries again.
    }
  }

  /** The requests screen counted them itself, after loading or deciding one. */
  const setPendingCount = (count: number) => {
    pendingCount.value = count
  }

  const onVisible = () => {
    if (document.visibilityState === 'visible') refresh()
  }

  /** Refreshes now, every minute, and when the admin comes back to the browser tab. */
  const watchPending = () => {
    if (timer) return
    refresh()
    timer = setInterval(refresh, REFRESH_INTERVAL_MS)
    document.addEventListener('visibilitychange', onVisible)
  }

  const stopWatching = () => {
    if (timer) clearInterval(timer)
    timer = null
    document.removeEventListener('visibilitychange', onVisible)
  }

  return { pendingCount, refresh, setPendingCount, watchPending, stopWatching }
})
