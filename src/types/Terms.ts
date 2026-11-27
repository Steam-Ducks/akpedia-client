import type { OptionalPermission, OptionalPermissionDraft } from '@/types/OptionalPermissions'

/** One published version of the terms of use, as `/api/v1/terms` and `/api/v1/admin/terms` answer it. */
export type TermsVersionDto = {
  /**
   * Numbered by the server in sequence (`1.0`, `2.0`, `3.0`). Versions published
   * before the numbering may hold other labels. The current one is the newest published, not the highest.
   */
  version: string
  title: string
  /** Plain text, paragraphs separated by blank lines. Never rendered as HTML. */
  content: string
  published_at: string
  published_by: string | null
  /** What users may agree to without being required to. Older servers may leave it out. */
  optional_permissions?: OptionalPermission[]
}

/** The newest version this user accepted. */
export type TermsAcceptanceDto = {
  version: string
  accepted_at: string
}

/**
 * Answer of `GET /api/v1/terms`: `current` is `null` while no terms were ever published. The
 * current terms are the newest published, whatever their version says.
 */
export type TermsStatusDto = {
  current: TermsVersionDto | null
  accepted: TermsAcceptanceDto | null
}

export type TermsVersion = {
  version: string
  title: string
  content: string
  publishedAt: Date
  publishedBy: string | null
  optionalPermissions: OptionalPermission[]
}

export type TermsAcceptance = {
  version: string
  acceptedAt: Date
}

/** What an admin fills in to publish a new version; the server numbers it, the next `X.0`. */
export type TermsDraft = {
  title: string
  content: string
  /** Adding, changing or removing one is what makes a new version: everyone accepts it again. */
  optionalPermissions: OptionalPermissionDraft[]
}

/**
 * What a user did with a version: accepted it, turned an optional permission on or off afterwards
 * (on their account page), or declined it.
 */
export type TermsHistoryAction = 'accepted' | 'updated' | 'declined'

/** One entry of `GET /api/v1/admin/terms/history`. `id` is unique only together with `action`. */
export type TermsHistoryEntryDto = {
  action: TermsHistoryAction
  id: number
  version: string
  user_id: number | null
  user_name: string | null
  user_email: string | null
  at: string
}

export type TermsHistoryEntry = {
  action: TermsHistoryAction
  id: number
  version: string
  userId: number | null
  userName: string | null
  userEmail: string | null
  at: Date
}

export type TermsHistoryPermissionDto = {
  id: string
  label: string
  description: string
  /** Right before the entry; `null` when the user had not chosen yet. */
  granted_before: boolean | null
  /** Right after it; the same as before for a refusal, which changes nothing. */
  granted_after: boolean | null
  /** The permission an `updated` entry turned on or off. */
  changed: boolean
}

/** Answer of `GET /api/v1/admin/terms/history/{action}/{id}`. */
export type TermsHistoryDetailDto = {
  action: TermsHistoryAction
  id: number
  version: string | null
  user_name: string | null
  user_email: string | null
  at: string
  permissions: TermsHistoryPermissionDto[]
}

export type TermsHistoryPermission = {
  id: string
  label: string
  description: string
  grantedBefore: boolean | null
  grantedAfter: boolean | null
  changed: boolean
}

export type TermsHistoryDetail = {
  action: TermsHistoryAction
  id: number
  version: string | null
  userName: string | null
  userEmail: string | null
  at: Date
  permissions: TermsHistoryPermission[]
}

export type TermsHistoryFilters = {
  version?: string
  user?: string
  page?: number
  size?: number
}
