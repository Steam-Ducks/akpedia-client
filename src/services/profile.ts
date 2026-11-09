import { apiFetch } from '@/services/api'
import type {
  ChangeRequest,
  ChangeRequestDto,
  NewChangeRequest,
  Profile,
  ProfileDto,
  ProfileUpdate,
} from '@/types/Profile'
import type { ApiError } from '@/types/SearchResult'
import { cpfDigits } from '@/utils/cpf'

/** What the user sees for the errors the profile endpoints answer with a code. */
const MESSAGE_BY_CODE: Record<string, string> = {
  invalid_profile: 'Dados inválidos: confira os campos e tente novamente.',
  nothing_changed: 'Nada mudou: altere algum campo antes de salvar.',
  invalid_change_request: 'Valor inválido: confira o novo valor e tente novamente.',
  change_request_pending:
    'Você já tem uma solicitação pendente para este campo. Aguarde a análise ou cancele-a.',
  change_request_not_found: 'Solicitação não encontrada. Ela pode já ter sido analisada.',
  change_request_not_pending: 'Esta solicitação já foi analisada.',
  user_exists: 'Já existe uma conta com este e-mail.',
  cpf_taken: 'Já existe uma conta com este CPF.',
  user_not_found: 'Usuário não encontrado. Ele pode ter sido removido do Keycloak.',
  keycloak_unavailable:
    'Não foi possível falar com o Keycloak agora. Tente novamente em alguns instantes.',
}

/** Codes whose server message says exactly what is wrong (which field), so it is shown as is. */
const SERVER_MESSAGE_CODES = ['invalid_profile', 'invalid_change_request']

/** The Portuguese message for an error `code`, or `null` for codes this screen does not know. */
export const profileErrorMessage = (code: string | undefined): string | null =>
  (code && MESSAGE_BY_CODE[code]) || null

/** Turns a failed response into an Error with the message the user should see. */
export async function profileError(response: Response, failure: string): Promise<Error> {
  const error = (await response.json().catch(() => null)) as ApiError | null
  const known = profileErrorMessage(error?.code)
  const serverFirst = !!error?.code && SERVER_MESSAGE_CODES.includes(error.code)
  const message = serverFirst ? error?.message || known : known || error?.message
  return new Error(message || `${failure} (HTTP ${response.status}).`)
}

export async function sendJson<T>(path: string, init: RequestInit, failure: string): Promise<T> {
  const response = await apiFetch(path, init)
  if (!response.ok) throw await profileError(response, failure)
  return (await response.json()) as T
}

export const jsonBody = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const toProfile = (dto: ProfileDto): Profile => ({
  firstName: dto.first_name ?? '',
  lastName: dto.last_name ?? '',
  email: dto.email ?? '',
  cpf: dto.cpf ?? null,
  sector: dto.sector ?? null,
  roles: dto.roles ?? [],
  editable: dto.editable ?? ['first_name', 'last_name', 'sector'],
  requestable: dto.requestable ?? ['email', 'cpf'],
})

export const toChangeRequest = (dto: ChangeRequestDto): ChangeRequest => ({
  id: dto.id,
  field: dto.field,
  newValue: dto.new_value,
  reason: dto.reason ?? null,
  status: dto.status,
  createdAt: new Date(dto.created_at),
  decidedAt: dto.decided_at ? new Date(dto.decided_at) : null,
  decisionNote: dto.decision_note ?? null,
  decidedByName: dto.decided_by_name ?? null,
  user: dto.user ?? null,
})

/** The logged-in user's profile, straight from Keycloak (CPF included: it is their own). */
export async function fetchMyProfile(): Promise<Profile> {
  const profile = await sendJson<ProfileDto>(
    '/api/v1/me/profile',
    {},
    'Não foi possível carregar os seus dados',
  )
  return toProfile(profile)
}

/**
 * Saves the user's name and sector. 400 `nothing_changed` when identical. The token still holds
 * the old name until it is refreshed: the caller refreshes the session afterwards.
 */
export async function updateMyProfile(update: ProfileUpdate): Promise<Profile> {
  const profile = await sendJson<ProfileDto>(
    '/api/v1/me/profile',
    jsonBody('PUT', {
      first_name: update.firstName.trim(),
      last_name: update.lastName.trim(),
      sector: update.sector,
    }),
    'Não foi possível salvar os seus dados',
  )
  return toProfile(profile)
}

/** The user's own e-mail/CPF change requests, newest first, whatever their status. */
export async function fetchMyChangeRequests(): Promise<ChangeRequest[]> {
  const requests = await sendJson<ChangeRequestDto[]>(
    '/api/v1/me/profile/requests',
    {},
    'Não foi possível carregar as suas solicitações',
  )
  return requests.map(toChangeRequest)
}

/** Asks the admins to change the user's e-mail or CPF. A CPF is sent as digits only. */
export async function createChangeRequest(request: NewChangeRequest): Promise<ChangeRequest> {
  const value = request.newValue.trim()
  const reason = request.reason?.trim()
  const created = await sendJson<ChangeRequestDto>(
    '/api/v1/me/profile/requests',
    jsonBody('POST', {
      field: request.field,
      new_value: request.field === 'cpf' ? cpfDigits(value) : value,
      reason: reason || null,
    }),
    'Não foi possível enviar a solicitação',
  )
  return toChangeRequest(created)
}

/** Withdraws one of the user's own pending requests. A 204 with no body. */
export async function cancelChangeRequest(id: number): Promise<void> {
  const response = await apiFetch(`/api/v1/me/profile/requests/${id}`, { method: 'DELETE' })
  if (!response.ok) throw await profileError(response, 'Não foi possível cancelar a solicitação')
}
