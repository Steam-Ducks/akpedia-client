/** One published version of the terms of use, as `/api/v1/terms` and `/api/v1/admin/terms` answer it. */
export type TermsVersionDto = {
  version: number
  title: string
  /** Plain text, paragraphs separated by blank lines. Never rendered as HTML. */
  content: string
  published_at: string
  published_by: string | null
}

/** The newest version this user accepted. */
export type TermsAcceptanceDto = {
  version: number
  accepted_at: string
}

/** Answer of `GET /api/v1/terms`: `current` is `null` while no terms were ever published. */
export type TermsStatusDto = {
  current: TermsVersionDto | null
  accepted: TermsAcceptanceDto | null
}

export type TermsVersion = {
  version: number
  title: string
  content: string
  publishedAt: Date
  publishedBy: string | null
}

export type TermsAcceptance = {
  version: number
  acceptedAt: Date
}

/** What an admin fills in to publish a new version. */
export type TermsDraft = {
  title: string
  content: string
}
