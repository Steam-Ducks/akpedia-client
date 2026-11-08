/** `EVENT`: named actions (terms accepted, document approved...). `REQUEST`: every API call. */
export type AuditKind = 'EVENT' | 'REQUEST' | 'ALL'

/** One row of `GET /api/v1/admin/audit`. */
export type AuditEntryDto = {
  id: number
  created_at: string
  action: string
  user_email: string | null
  user_name: string | null
  /** Stable label ("Usuário removido #12") when the row's user deleted their account. */
  user_pseudonym?: string | null
  entity_type: string | null
  entity_id: number | null
  details: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  http_method: string | null
  path: string | null
  status_code: number | null
  duration_ms: number | null
}

export type AuditEntry = {
  id: number
  createdAt: Date
  action: string
  userEmail: string | null
  userName: string | null
  /** Stands for a deleted user, whose name and e-mail are gone. */
  userPseudonym: string | null
  entityType: string | null
  entityId: number | null
  details: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  httpMethod: string | null
  path: string | null
  statusCode: number | null
  durationMs: number | null
}

export type AuditFilters = {
  kind?: AuditKind
  /** Event name; ignored by the server for requests. */
  action?: string
  /** Part of the user's e-mail. */
  user?: string
  from?: Date | null
  to?: Date | null
  page?: number
  size?: number
}
