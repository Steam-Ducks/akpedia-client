import { API_BASE_URL } from '@/config/api'
import { accessToken, loginAgain } from '@/services/auth'

let termsNotAccepted: (() => void) | null = null

/**
 * Called whenever the server refuses a call because the current terms of use were not accepted,
 * e.g. when an admin publishes a new version while the user is in the app.
 */
export function onTermsNotAccepted(callback: (() => void) | null): void {
  termsNotAccepted = callback
}

/** `fetch` to the akpedia-server API, with the logged-in user's token. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await accessToken()
  const headers = { ...(init.headers as Record<string, string> | undefined) }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  if (response.status === 401) loginAgain()
  if (response.status === 403 && termsNotAccepted) {
    // A clone, so the caller can still read the body.
    const error = (await response
      .clone()
      .json()
      .catch(() => null)) as { code?: string } | null
    if (error?.code === 'terms_not_accepted') termsNotAccepted()
  }
  return response
}
