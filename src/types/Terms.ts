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
}

export type TermsAcceptance = {
  version: string
  acceptedAt: Date
}

/** What an admin fills in to publish a new version; the server numbers it, the next `X.0`. */
export type TermsDraft = {
  title: string
  content: string
}

export type TermsAcceptanceEntryDto = {
  id: number
  version: string
  user_id: number
  user_name: string | null
  user_email: string | null
  accepted_at: string
}

export type TermsAcceptanceEntry = {
  id: number
  version: string
  userId: number
  userName: string | null
  userEmail: string | null
  acceptedAt: Date
}

export type TermsAcceptanceFilters = {
  version?: string
  user?: string
  page?: number
  size?: number
}
