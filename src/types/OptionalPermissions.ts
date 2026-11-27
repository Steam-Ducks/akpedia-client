/** One optional permission of a version of the terms of use. */
export type OptionalPermission = {
  id: string
  label: string
  description: string
}

/**
 * An optional permission in the admin's next version of the terms. `id` keeps a permission of the
 * current version; without it, the server names a new one.
 */
export type OptionalPermissionDraft = {
  id?: string | null
  label: string
  description: string
}

/** One optional permission of the current terms with the user's choice, as `GET /api/v1/optional-permissions` answers it. */
export type UserOptionalPermissionDto = {
  id: string
  label: string
  description: string
  granted: boolean
  /** `false` until the user chose in this version: it counts as off. */
  decided: boolean
  decided_at: string | null
  /** How it differs from the previous version of the terms. */
  change: 'new' | 'changed' | null
}

export type UserOptionalPermissionsDto = {
  /** The current terms version, or `null` while none was published. */
  version: string | null
  published_at: string | null
  permissions: UserOptionalPermissionDto[]
}

export type UserOptionalPermission = {
  id: string
  label: string
  description: string
  granted: boolean
  decided: boolean
  decidedAt: Date | null
  change: 'new' | 'changed' | null
}

export type UserOptionalPermissions = {
  version: string | null
  permissions: UserOptionalPermission[]
}
