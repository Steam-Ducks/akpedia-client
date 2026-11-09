import { apiFetch } from '@/services/api'
import { toPage } from '@/services/page-mapper'
import type { AuditEntry, AuditEntryDto, AuditFilters } from '@/types/Audit'
import type { Page, PageDto } from '@/types/Page'
import type { ApiError } from '@/types/SearchResult'

const DEFAULT_PAGE_SIZE = 50

/** The action of every row that logs a plain API call. */
export const HTTP_REQUEST_ACTION = 'HTTP_REQUEST'

const LABEL_BY_ACTION: Record<string, string> = {
  [HTTP_REQUEST_ACTION]: 'Requisição',
  TERMS_ACCEPTED: 'Aceitou os termos',
  TERMS_DECLINED: 'Recusou os termos',
  TERMS_PUBLISHED: 'Publicou os termos',
  DOCUMENT_UPLOADED: 'Enviou um documento',
  DOCUMENT_APPROVED: 'Aprovou um documento',
  DOCUMENT_REJECTED: 'Devolveu um documento',
  USER_ROLES_CHANGED: 'Alterou os papéis de um usuário',
  USER_ENABLED: 'Reativou um usuário',
  USER_DISABLED: 'Desativou um usuário',
  USER_CREATED: 'Cadastrou um usuário',
  ACCOUNT_DELETED: 'Excluiu a própria conta',
  PROFILE_UPDATED: 'Alterou os próprios dados',
  PROFILE_CHANGE_REQUESTED: 'Pediu para alterar e-mail ou CPF',
  PROFILE_CHANGE_APPROVED: 'Aprovou uma alteração de e-mail ou CPF',
  PROFILE_CHANGE_REJECTED: 'Recusou uma alteração de e-mail ou CPF',
  USER_UPDATED: 'Alterou os dados de um usuário',
  SECTOR_CATEGORIES_CHANGED: 'Alterou as categorias de um setor',
}

const LABEL_BY_ENTITY: Record<string, string> = {
  TERMS_VERSION: 'Termos',
  DOCUMENT: 'Documento',
  USER: 'Usuário',
  SECTOR: 'Setor',
  PROFILE_CHANGE_REQUEST: 'Solicitação de alteração',
}

/** A readable name for an audit action; unknown ones are shown as they are. */
export const auditActionLabel = (action: string): string => LABEL_BY_ACTION[action] ?? action

/** A readable name for an entity type; unknown ones are shown as they are. */
export const auditEntityLabel = (entityType: string): string =>
  LABEL_BY_ENTITY[entityType] ?? entityType

export const toAuditEntry = (dto: AuditEntryDto): AuditEntry => ({
  id: dto.id,
  createdAt: new Date(dto.created_at),
  action: dto.action,
  userEmail: dto.user_email,
  userName: dto.user_name,
  userPseudonym: dto.user_pseudonym ?? null,
  entityType: dto.entity_type,
  entityId: dto.entity_id,
  details: dto.details,
  ipAddress: dto.ip_address,
  userAgent: dto.user_agent,
  httpMethod: dto.http_method,
  path: dto.path,
  statusCode: dto.status_code,
  durationMs: dto.duration_ms,
})

async function get<T>(path: string, failure: string): Promise<T> {
  const response = await apiFetch(path)

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiError | null
    throw new Error(error?.message ?? `${failure} (HTTP ${response.status}).`)
  }

  return (await response.json()) as T
}

/** The audit log, newest first. Only the filters that are set are sent. */
export async function fetchAuditLog(filters: AuditFilters = {}): Promise<Page<AuditEntry>> {
  const params = new URLSearchParams({
    kind: filters.kind ?? 'EVENT',
    page: String(filters.page ?? 0),
    size: String(filters.size ?? DEFAULT_PAGE_SIZE),
  })
  if (filters.action) params.set('action', filters.action)
  if (filters.user?.trim()) params.set('user', filters.user.trim())
  if (filters.from) params.set('from', filters.from.toISOString())
  if (filters.to) params.set('to', filters.to.toISOString())

  const entries = await get<PageDto<AuditEntryDto>>(
    `/api/v1/admin/audit?${params}`,
    'Não foi possível carregar a auditoria',
  )
  return toPage(entries, toAuditEntry)
}

/** Every event action logged so far (plain requests excluded), sorted. */
export function fetchAuditActions(): Promise<string[]> {
  return get<string[]>('/api/v1/admin/audit/actions', 'Não foi possível carregar as ações')
}
