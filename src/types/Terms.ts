/** One published version of the terms of use, as `/api/v1/terms` and `/api/v1/admin/terms` answer it. */
export type TermsVersionDto = {
  /** What the admin called this version, such as `1.0` or `2026.1`. A label, not an order. */
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

/** What an admin fills in to publish a new version. */
export type TermsDraft = {
  /** Typed by the admin: 1–20 letters, digits, `.`, `-` or `_`, new in any case. */
  version: string
  title: string
  content: string
}
