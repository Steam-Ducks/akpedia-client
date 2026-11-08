import { apiFetch } from '@/services/api'
import { toPage } from '@/services/page-mapper'
import type {
  AdminUser,
  AdminUserDto,
  AdminUserQuery,
  NewUser,
  NewUserDto,
  Role,
  RoleDto,
} from '@/types/AdminUser'
import type { Page, PageDto } from '@/types/Page'
import type { AdminProfileUpdate } from '@/types/Profile'
import { cpfDigits, formatCpf } from '@/utils/cpf'
import type { ApiError } from '@/types/SearchResult'

const DEFAULT_PAGE_SIZE = 20

/** What the user sees for the errors these endpoints answer with a code. */
const MESSAGE_BY_CODE: Record<string, string> = {
  cannot_change_own_admin: 'Você não pode remover o seu próprio papel de administrador.',
  cannot_disable_self: 'Você não pode desativar a sua própria conta.',
  invalid_user: 'Dados inválidos: confira os campos e tente novamente.',
  invalid_profile: 'Dados inválidos: confira os campos e tente novamente.',
  nothing_changed: 'Nada mudou: altere algum campo antes de salvar.',
  invalid_role: 'Papel inválido: só é possível atribuir os papéis Aprovador e Administrador.',
  user_exists: 'Já existe uma conta com este e-mail.',
  user_not_found: 'Usuário não encontrado. Ele pode ter sido removido do Keycloak.',
  keycloak_unavailable:
    'Não foi possível falar com o Keycloak agora. Tente novamente em alguns instantes.',
}

/** The Portuguese message for an error `code`, or `null` for codes this screen does not know. */
export const adminUserErrorMessage = (code: string | undefined): string | null =>
  (code && MESSAGE_BY_CODE[code]) || null

/**
 * First and last name. Keycloak's full name is "first last"; without the parts from the server,
 * the first word is taken as the first name.
 */
const splitName = (dto: AdminUserDto): { firstName: string; lastName: string } => {
  if (dto.first_name != null || dto.last_name != null) {
    return { firstName: dto.first_name ?? '', lastName: dto.last_name ?? '' }
  }
  const [first = '', ...rest] = (dto.name ?? '').trim().split(/\s+/)
  return { firstName: first, lastName: rest.join(' ') }
}

export const toAdminUser = (dto: AdminUserDto): AdminUser => ({
  id: dto.id,
  name: dto.name,
  email: dto.email,
  sector: dto.sector,
  cpf: dto.cpf ?? null,
  ...splitName(dto),
  enabled: dto.enabled,
  roles: dto.roles,
  termsAcceptedVersion: dto.terms_accepted_version,
  currentTermsVersion: dto.current_terms_version,
  createdAt: dto.created_at ? new Date(dto.created_at) : null,
})

export const toRole = (dto: RoleDto): Role => ({
  name: dto.name,
  label: dto.label,
  description: dto.description ?? null,
  assignable: dto.assignable,
  permissions: dto.permissions,
})

/** Codes whose server message says exactly what is wrong (which field), so it is shown as is. */
const SERVER_MESSAGE_CODES = ['invalid_user', 'invalid_profile']

async function send<T>(path: string, init: RequestInit, failure: string): Promise<T> {
  const response = await apiFetch(path, init)

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiError | null
    const known = adminUserErrorMessage(error?.code)
    const serverFirst = !!error?.code && SERVER_MESSAGE_CODES.includes(error.code)
    const message = serverFirst ? error?.message || known : known || error?.message
    throw new Error(message || `${failure} (HTTP ${response.status}).`)
  }

  return (await response.json()) as T
}

const toNewUserDto = (user: NewUser): NewUserDto => ({
  first_name: user.firstName.trim(),
  last_name: user.lastName.trim(),
  email: user.email.trim(),
  password: user.password,
  cpf: user.cpf.replace(/\D/g, ''),
  sector: user.sector,
  roles: user.roles,
})

const postJson = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const putJson = (body: unknown): RequestInit => ({
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

/** Keycloak's users, sorted as Keycloak returns them. `search` matches name, e-mail or login. */
export async function fetchAdminUsers({
  search = '',
  page = 0,
  size = DEFAULT_PAGE_SIZE,
}: AdminUserQuery = {}): Promise<Page<AdminUser>> {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (search.trim()) params.set('search', search.trim())

  const users = await send<PageDto<AdminUserDto>>(
    `/api/v1/admin/users?${params}`,
    {},
    'Não foi possível carregar os usuários',
  )
  return toPage(users, toAdminUser)
}

/** Every role, with the permissions it grants. */
export async function fetchRoles(): Promise<Role[]> {
  const roles = await send<RoleDto[]>(
    '/api/v1/admin/roles',
    {},
    'Não foi possível carregar os papéis',
  )
  return roles.map(toRole)
}

/**
 * Sets the user's assignable roles (APPROVER, ADMIN) to exactly `roles`; STANDARD stays. Takes
 * effect at the user's next login or token refresh.
 */
export async function updateUserRoles(id: string, roles: string[]): Promise<AdminUser> {
  const user = await send<AdminUserDto>(
    `/api/v1/admin/users/${encodeURIComponent(id)}/roles`,
    putJson({ roles }),
    'Não foi possível alterar os papéis',
  )
  return toAdminUser(user)
}

/** Enables or disables the user's account in Keycloak. */
export async function updateUserStatus(id: string, enabled: boolean): Promise<AdminUser> {
  const user = await send<AdminUserDto>(
    `/api/v1/admin/users/${encodeURIComponent(id)}/status`,
    putJson({ enabled }),
    enabled ? 'Não foi possível reativar o usuário' : 'Não foi possível desativar o usuário',
  )
  return toAdminUser(user)
}

/**
 * Creates an enabled Keycloak account with a permanent password and the given assignable roles.
 * 409 `user_exists` when the e-mail is taken, 400 `invalid_user` with the field at fault.
 */
export async function createUser(user: NewUser): Promise<AdminUser> {
  const created = await send<AdminUserDto>(
    '/api/v1/admin/users',
    postJson(toNewUserDto(user)),
    'Não foi possível criar o usuário',
  )
  return toAdminUser(created)
}

/**
 * What the admin's edit form starts from. The server sends the CPF with each user of the list
 * (`AdminUser.cpf`), so nothing else is fetched; kept here in case that changes.
 */
export const adminProfileOf = (user: AdminUser): AdminProfileUpdate => ({
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  cpf: formatCpf(user.cpf),
  sector: user.sector ?? '',
})

/**
 * Changes anyone's name, e-mail (which is also their login), CPF and sector. 400
 * `nothing_changed` when identical, 409 `user_exists` when the e-mail is taken.
 */
export async function updateUserProfile(
  id: string,
  update: AdminProfileUpdate,
): Promise<AdminUser> {
  const user = await send<AdminUserDto>(
    `/api/v1/admin/users/${encodeURIComponent(id)}/profile`,
    putJson({
      first_name: update.firstName.trim(),
      last_name: update.lastName.trim(),
      email: update.email.trim(),
      cpf: cpfDigits(update.cpf),
      sector: update.sector,
    }),
    'Não foi possível salvar os dados do usuário',
  )
  return toAdminUser(user)
}
