/** Profile fields the user edits themself (`PUT /api/v1/me/profile`). */
export type EditableProfileField = 'first_name' | 'last_name' | 'sector'

/** Profile fields only an admin changes; the user asks for it (`POST /api/v1/me/profile/requests`). */
export type RequestableProfileField = 'email' | 'cpf'

/** The logged-in user's data, as `GET /api/v1/me/profile` answers it (read from Keycloak). */
export type ProfileDto = {
  first_name: string
  last_name: string
  email: string
  cpf: string | null
  sector: string | null
  roles: string[]
  editable?: string[]
  requestable?: string[]
}

export type Profile = {
  firstName: string
  lastName: string
  email: string
  /** Digits only, as Keycloak keeps it; `null` when the account has none. */
  cpf: string | null
  sector: string | null
  roles: string[]
  editable: string[]
  requestable: string[]
}

/** What the user changes on their own profile. */
export type ProfileUpdate = {
  firstName: string
  lastName: string
  sector: string
}

/** What an admin changes on anyone's profile (`PUT /api/v1/admin/users/{id}/profile`). */
export type AdminProfileUpdate = ProfileUpdate & {
  email: string
  /** 11 digits; any punctuation is stripped before sending. */
  cpf: string
}

export type ChangeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/** A request to change one's e-mail or CPF, as the server answers it. */
export type ChangeRequestDto = {
  id: number
  field: RequestableProfileField
  new_value: string
  reason: string | null
  status: ChangeRequestStatus
  created_at: string
  decided_at: string | null
  decision_note: string | null
  decided_by_name: string | null
  /** Filled in on the admin endpoints. */
  user?: { id: string | null; name: string; email: string } | null
}

export type ChangeRequest = {
  id: number
  field: RequestableProfileField
  newValue: string
  reason: string | null
  status: ChangeRequestStatus
  createdAt: Date
  decidedAt: Date | null
  decisionNote: string | null
  decidedByName: string | null
  /** Who asked; `null` on the user's own list. */
  user: { id: string | null; name: string; email: string } | null
}

/** What the user sends to ask for an e-mail or CPF change. */
export type NewChangeRequest = {
  field: RequestableProfileField
  newValue: string
  reason?: string
}

export type ChangeRequestStatusFilter = ChangeRequestStatus | 'ALL'
