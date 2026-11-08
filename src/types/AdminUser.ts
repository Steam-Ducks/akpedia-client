/** Realm roles the app knows about. STANDARD is everyone's; APPROVER and ADMIN are assigned. */
export type RoleName = 'STANDARD' | 'APPROVER' | 'ADMIN'

/** One Keycloak user, as `GET /api/v1/admin/users` answers it. */
export type AdminUserDto = {
  id: string
  name: string
  email: string
  sector: string | null
  /** 11 digits; for the admin's edit form. */
  cpf?: string | null
  /** Split name, when the server sends it; otherwise {@link AdminUserDto.name} is split. */
  first_name?: string | null
  last_name?: string | null
  enabled: boolean
  roles: string[]
  terms_accepted_version: string | null
  current_terms_version: string | null
  created_at: string | null
}

export type AdminUser = {
  /** Keycloak id. */
  id: string
  name: string
  email: string
  sector: string | null
  /** Digits only; `null` when the account has none. */
  cpf: string | null
  firstName: string
  lastName: string
  enabled: boolean
  roles: string[]
  termsAcceptedVersion: string | null
  /** `null` while no terms were ever published. */
  currentTermsVersion: string | null
  createdAt: Date | null
}

/** One role of `GET /api/v1/admin/roles`, with its fixed, read-only permissions. */
export type RoleDto = {
  name: string
  label: string
  description?: string | null
  assignable: boolean
  permissions: string[]
}

export type Role = {
  name: string
  label: string
  description: string | null
  /** STANDARD is not: it comes with every account. */
  assignable: boolean
  permissions: string[]
}

export type AdminUserQuery = {
  search?: string
  page?: number
  size?: number
}

/** The sectors the realm's User Profile allows (akpedia-server/keycloak/akpedia-realm.json). */
export const SECTORS = [
  'Setor 1',
  'Setor 2',
  'Setor 3',
  'Setor 4',
  'Setor 5',
  'Setor 6',
  'Setor 7',
] as const

/** What an admin fills in to create an account. */
export type NewUser = {
  firstName: string
  lastName: string
  email: string
  password: string
  /** 11 digits, numbers only. */
  cpf: string
  sector: string
  /** Assignable roles only (APPROVER, ADMIN); STANDARD comes with every account. */
  roles: string[]
}

/** Body of `POST /api/v1/admin/users`. */
export type NewUserDto = {
  first_name: string
  last_name: string
  email: string
  password: string
  cpf: string
  sector: string
  roles: string[]
}
