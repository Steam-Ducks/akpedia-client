import { apiFetch, type CpfRefusal } from '@/services/api'
import type { ApiError } from '@/types/SearchResult'

/** What the user sees for the errors `DELETE /api/v1/me` answers with a code. */
const MESSAGE_BY_CODE: Record<string, string> = {
  last_admin:
    'Você é o único administrador ativo. Torne outra pessoa administradora antes de excluir a sua conta.',
  keycloak_unavailable:
    'Não foi possível falar com o Keycloak agora. Tente novamente em alguns instantes.',
}

/**
 * Deletes the logged-in user's account for good: the Keycloak login goes and the personal data is
 * removed (only an admin can register them again). A 204 with no body. The caller logs out
 * afterwards.
 */
export async function deleteMyAccount(): Promise<void> {
  const response = await apiFetch('/api/v1/me', { method: 'DELETE' })
  if (response.ok) return

  const error = (await response.json().catch(() => null)) as ApiError | null
  throw new Error(
    (error?.code && MESSAGE_BY_CODE[error.code]) ||
      error?.message ||
      `Não foi possível excluir a sua conta (HTTP ${response.status}).`,
  )
}

/** What `GET /api/v1/me` says about the account that the app needs before showing any page. */
export type AccountStatus = {
  /** Why the CPF on the account was refused; `null` when it was not. */
  cpfProblem: CpfRefusal | null
}

/** Reads the logged-in user's status. Open before the terms are accepted, and with a refused CPF. */
export async function fetchAccountStatus(): Promise<AccountStatus> {
  const response = await apiFetch('/api/v1/me')
  if (!response.ok) {
    throw new Error(`Não foi possível carregar a sua conta (HTTP ${response.status}).`)
  }
  const me = (await response.json()) as { cpf_problem?: CpfRefusal | null }
  return { cpfProblem: me.cpf_problem ?? null }
}
