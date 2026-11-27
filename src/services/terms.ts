import { apiFetch } from '@/services/api'
import type { ApiError } from '@/types/SearchResult'
import { toPage } from '@/services/page-mapper'
import type { Page, PageDto } from '@/types/Page'
import type {
  TermsAcceptance,
  TermsAcceptanceDto,
  TermsHistoryAction,
  TermsHistoryDetail,
  TermsHistoryDetailDto,
  TermsHistoryEntry,
  TermsHistoryEntryDto,
  TermsHistoryFilters,
  TermsDraft,
  TermsStatusDto,
  TermsVersion,
  TermsVersionDto,
} from '@/types/Terms'

/** Raised when accepting a version that is no longer the current one (409 `terms_changed`). */
export class TermsChangedError extends Error {}

/** Raised when the number the server counted was taken anyway (409 `terms_version_exists`). */
export class TermsVersionExistsError extends Error {}

/** `X.0`, or an older `X.Y`: counted by its `X`. Anything else is a label from before the numbering. */
const NUMBERED_VERSION = /^(\d+)\.\d+$/

/**
 * The version the next publish gets, counted as the server does: one past the highest major,
 * `X.0`, skipping labels that are not numbered. Only shown to the admin: the server numbers it.
 */
export const nextTermsVersion = (published: string[]): string => {
  let major = 0
  for (const version of published) {
    const numbered = NUMBERED_VERSION.exec(version.trim())
    if (numbered) major = Math.max(major, Number(numbered[1]))
  }
  return `${major + 1}.0`
}

export const toTermsVersion = (dto: TermsVersionDto): TermsVersion => ({
  version: dto.version,
  title: dto.title,
  content: dto.content,
  publishedAt: new Date(dto.published_at),
  publishedBy: dto.published_by,
  optionalPermissions: dto.optional_permissions ?? [],
})

const toTermsAcceptance = (dto: TermsAcceptanceDto): TermsAcceptance => ({
  version: dto.version,
  acceptedAt: new Date(dto.accepted_at),
})

const toTermsHistoryEntry = (dto: TermsHistoryEntryDto): TermsHistoryEntry => ({
  action: dto.action,
  id: dto.id,
  version: dto.version,
  userId: dto.user_id,
  userName: dto.user_name,
  userEmail: dto.user_email,
  at: new Date(dto.at),
})

const toTermsHistoryDetail = (dto: TermsHistoryDetailDto): TermsHistoryDetail => ({
  action: dto.action,
  id: dto.id,
  version: dto.version,
  userName: dto.user_name,
  userEmail: dto.user_email,
  at: new Date(dto.at),
  permissions: dto.permissions.map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description,
    grantedBefore: p.granted_before,
    grantedAfter: p.granted_after,
    changed: p.changed,
  })),
})

async function send<T>(path: string, init: RequestInit, failure: string): Promise<T> {
  const response = await apiFetch(path, init)

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiError | null
    if (response.status === 409 && error?.code === 'terms_changed') {
      throw new TermsChangedError(error.message)
    }
    if (response.status === 409 && error?.code === 'terms_version_exists') {
      throw new TermsVersionExistsError(error.message)
    }
    throw new Error(error?.message ?? `${failure} (HTTP ${response.status}).`)
  }

  return (await response.json()) as T
}

const postJson = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

/** The current terms, if any were published, and the newest version this user accepted. */
export async function fetchTerms(): Promise<{
  current: TermsVersion | null
  accepted: TermsAcceptance | null
}> {
  const status = await send<TermsStatusDto>(
    '/api/v1/terms',
    {},
    'Não foi possível carregar os termos de uso',
  )
  return {
    current: status.current && toTermsVersion(status.current),
    accepted: status.accepted && toTermsAcceptance(status.accepted),
  }
}

/**
 * Accepts `version`, which must still be the current one, with the user's choice for each of its
 * optional permissions (any left out is not allowed).
 */
export async function acceptTerms(
  version: string,
  optionalPermissions: Record<string, boolean> = {},
): Promise<TermsAcceptance> {
  const accepted = await send<TermsAcceptanceDto>(
    '/api/v1/terms/accept',
    postJson({ version, optional_permissions: optionalPermissions }),
    'Não foi possível aceitar os termos de uso',
  )
  return toTermsAcceptance(accepted)
}

/**
 * Records that the user declined `version`, right before their account is deleted. A 204 with no
 * body.
 */
export async function declineTerms(version: string): Promise<void> {
  const response = await apiFetch('/api/v1/terms/decline', postJson({ version }))
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiError | null
    throw new Error(
      error?.message ?? `Não foi possível registrar a recusa dos termos (HTTP ${response.status}).`,
    )
  }
}

/** Every published version, newest first (by publication: the first is the current one). Admins only. */
export async function fetchTermsVersions(): Promise<TermsVersion[]> {
  const versions = await send<TermsVersionDto[]>(
    '/api/v1/admin/terms',
    {},
    'Não foi possível carregar as versões dos termos',
  )
  return versions.map(toTermsVersion)
}

/**
 * Publishes a new version, numbered by the server as the next `X.0`; every user, the admin
 * included, has to accept it. Admins only.
 */
export async function publishTerms(draft: TermsDraft): Promise<TermsVersion> {
  const published = await send<TermsVersionDto>(
    '/api/v1/admin/terms',
    postJson({
      title: draft.title,
      content: draft.content,
      optional_permissions: draft.optionalPermissions,
    }),
    'Não foi possível publicar os termos de uso',
  )
  return toTermsVersion(published)
}

const HISTORY_PAGE_SIZE = 20

/**
 * What each user did with each version (accepted, updated an optional permission, declined),
 * newest first. Only the filters that are set are sent. Admins only.
 */
export async function fetchTermsHistory(
  filters: TermsHistoryFilters = {},
): Promise<Page<TermsHistoryEntry>> {
  const params = new URLSearchParams({
    page: String(filters.page ?? 0),
    size: String(filters.size ?? HISTORY_PAGE_SIZE),
  })
  if (filters.version) params.set('version', filters.version)
  if (filters.user?.trim()) params.set('user', filters.user.trim())

  const entries = await send<PageDto<TermsHistoryEntryDto>>(
    `/api/v1/admin/terms/history?${params}`,
    {},
    'Não foi possível carregar o histórico dos termos',
  )
  return toPage(entries, toTermsHistoryEntry)
}

/** One entry of the history with the optional permissions of its version, before and after it. Admins only. */
export async function fetchTermsHistoryEntry(
  action: TermsHistoryAction,
  id: number,
): Promise<TermsHistoryDetail> {
  const detail = await send<TermsHistoryDetailDto>(
    `/api/v1/admin/terms/history/${action}/${id}`,
    {},
    'Não foi possível carregar as permissões deste registro',
  )
  return toTermsHistoryDetail(detail)
}
