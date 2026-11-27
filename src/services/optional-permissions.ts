import { apiFetch } from '@/services/api'
import type { ApiError } from '@/types/SearchResult'
import type {
  UserOptionalPermissions,
  UserOptionalPermissionsDto,
} from '@/types/OptionalPermissions'

/** The terms changed since the user saw them (409 `optional_permissions_changed`). */
export class OptionalPermissionsChangedError extends Error {}

export const toUserOptionalPermissions = (
  dto: UserOptionalPermissionsDto,
): UserOptionalPermissions => ({
  version: dto.version,
  permissions: dto.permissions.map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description,
    granted: p.granted,
    decided: p.decided,
    decidedAt: p.decided_at ? new Date(p.decided_at) : null,
    change: p.change,
  })),
})

async function send<T>(path: string, init: RequestInit, failure: string): Promise<T> {
  const response = await apiFetch(path, init)
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiError | null
    if (response.status === 409 && error?.code === 'optional_permissions_changed') {
      throw new OptionalPermissionsChangedError(error.message)
    }
    throw new Error(error?.message ?? `${failure} (HTTP ${response.status}).`)
  }
  return (await response.json()) as T
}

/** The optional permissions of the current terms and the user's choice for each. */
export async function fetchOptionalPermissions(): Promise<UserOptionalPermissions> {
  const dto = await send<UserOptionalPermissionsDto>(
    '/api/v1/optional-permissions',
    {},
    'Não foi possível carregar as permissões opcionais',
  )
  return toUserOptionalPermissions(dto)
}

/** Turns one on or off, for the version of the terms the user saw. */
export async function chooseOptionalPermission(
  id: string,
  granted: boolean,
  version: string,
): Promise<void> {
  await send(
    `/api/v1/optional-permissions/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ granted, version }),
    },
    'Não foi possível salvar a sua escolha',
  )
}
