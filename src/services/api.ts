import { API_BASE_URL } from '@/config/api'
import { accessToken, loginAgain } from '@/services/auth'

/** `fetch` to the akpedia-server API, with the logged-in user's token. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await accessToken()
  const headers = { ...(init.headers as Record<string, string> | undefined) }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  if (response.status === 401) loginAgain()
  return response
}
