import { apiFetch } from '@/services/api'
import type { ApiError } from '@/types/SearchResult'
import { toPage } from '@/services/page-mapper'
import type { Page, PageDto } from '@/types/Page'
import type {
  TermsAcceptance,
  TermsAcceptanceDto,
  TermsAcceptanceEntry,
  TermsAcceptanceEntryDto,
  TermsAcceptanceFilters,
  TermsDraft,
  TermsStatusDto,
  TermsVersion,
  TermsVersionDto,
} from '@/types/Terms'

/** Raised when accepting a version that is no longer the current one (409 `terms_changed`). */
export class TermsChangedError extends Error {}

/** Raised when publishing a version that was published before, in any case (409 `terms_version_exists`). */
export class TermsVersionExistsError extends Error {}

/** A version the server takes: trimmed, 1–20 letters, digits, `.`, `-` or `_`. */
export const TERMS_VERSION_PATTERN = /^[A-Za-z0-9._-]{1,20}$/

/** Versions are told apart ignoring case and the spaces around them, as the server does. */
export const sameTermsVersion = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase()

export const toTermsVersion = (dto: TermsVersionDto): TermsVersion => ({
  version: dto.version,
  title: dto.title,
  content: dto.content,
  publishedAt: new Date(dto.published_at),
  publishedBy: dto.published_by,
})

const toTermsAcceptance = (dto: TermsAcceptanceDto): TermsAcceptance => ({
  version: dto.version,
  acceptedAt: new Date(dto.accepted_at),
})

const toTermsAcceptanceEntry = (dto: TermsAcceptanceEntryDto): TermsAcceptanceEntry => ({
  id: dto.id,
  version: dto.version,
  userId: dto.user_id,
  userName: dto.user_name,
  userEmail: dto.user_email,
  acceptedAt: new Date(dto.accepted_at),
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

/** Accepts `version`, which must still be the current one. */
export async function acceptTerms(version: string): Promise<TermsAcceptance> {
  const accepted = await send<TermsAcceptanceDto>(
    '/api/v1/terms/accept',
    postJson({ version }),
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
 * Publishes a new version, named `draft.version`; every user, the admin included, has to accept it.
 * Throws {@link TermsVersionExistsError} when that version was published before. Admins only.
 */
export async function publishTerms(draft: TermsDraft): Promise<TermsVersion> {
  const published = await send<TermsVersionDto>(
    '/api/v1/admin/terms',
    postJson(draft),
    'Não foi possível publicar os termos de uso',
  )
  return toTermsVersion(published)
}

const ACCEPTANCES_PAGE_SIZE = 20

/** Who accepted which version, newest first. Only the filters that are set are sent. Admins only. */
export async function fetchTermsAcceptances(
  filters: TermsAcceptanceFilters = {},
): Promise<Page<TermsAcceptanceEntry>> {
  const params = new URLSearchParams({
    page: String(filters.page ?? 0),
    size: String(filters.size ?? ACCEPTANCES_PAGE_SIZE),
  })
  if (filters.version) params.set('version', filters.version)
  if (filters.user?.trim()) params.set('user', filters.user.trim())

  const entries = await send<PageDto<TermsAcceptanceEntryDto>>(
    `/api/v1/admin/terms/acceptances?${params}`,
    {},
    'Não foi possível carregar os aceites dos termos',
  )
  return toPage(entries, toTermsAcceptanceEntry)
}
