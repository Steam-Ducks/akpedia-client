import { API_BASE_URL } from '@/config/api'
import { accessToken, loginAgain } from '@/services/auth'

/** Why the server refuses the CPF on the user's account, keeping them out of the app. */
export type CpfRefusal = 'invalid_cpf' | 'cpf_taken'

const CPF_REFUSALS: readonly string[] = ['invalid_cpf', 'cpf_taken'] satisfies CpfRefusal[]

let termsNotAccepted: (() => void) | null = null
let cpfRefused: ((code: CpfRefusal) => void) | null = null

/**
 * Called whenever the server refuses a call because the current terms of use were not accepted,
 * e.g. when an admin publishes a new version while the user is in the app.
 */
export function onTermsNotAccepted(callback: (() => void) | null): void {
  termsNotAccepted = callback
}

/**
 * Called whenever the server refuses a call because the CPF on the user's account is invalid or
 * another user's, until an admin corrects it.
 */
export function onCpfRefused(callback: ((code: CpfRefusal) => void) | null): void {
  cpfRefused = callback
}

/** The error code of a failed response, read from a clone so the caller can still read the body. */
const errorCode = async (response: Response): Promise<string | undefined> => {
  const error = (await response
    .clone()
    .json()
    .catch(() => null)) as { code?: string } | null
  return error?.code
}

/** `fetch` to the akpedia-server API, with the logged-in user's token. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await accessToken()
  const headers = { ...(init.headers as Record<string, string> | undefined) }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  if (response.status === 401) loginAgain()
  if (response.status === 403 && termsNotAccepted) {
    if ((await errorCode(response)) === 'terms_not_accepted') termsNotAccepted()
  }
  if (response.status === 422 && cpfRefused) {
    const code = await errorCode(response)
    if (code && CPF_REFUSALS.includes(code)) cpfRefused(code as CpfRefusal)
  }
  return response
}
