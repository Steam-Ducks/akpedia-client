import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useOptionalPermissionsStore } from '../optional-permissions-store'
import {
  chooseOptionalPermission,
  fetchOptionalPermissions,
  OptionalPermissionsChangedError,
} from '@/services/optional-permissions'

vi.mock('@/services/optional-permissions', () => ({
  fetchOptionalPermissions: vi.fn(),
  chooseOptionalPermission: vi.fn(),
  OptionalPermissionsChangedError: class extends Error {},
}))

const permission = (id: string, decided = false) => ({
  id,
  label: id,
  description: `${id} description`,
  granted: false,
  decided,
  decidedAt: null,
  change: null,
})

describe('optional permissions store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(fetchOptionalPermissions).mockResolvedValue({
      version: '2.0',
      permissions: [permission('newsletter'), permission('analytics', true)],
    })
  })

  it('saves a choice for the terms version on screen', async () => {
    const store = useOptionalPermissionsStore()
    await store.load()
    await store.choose('newsletter', true)
    expect(chooseOptionalPermission).toHaveBeenCalledWith('newsletter', true, '2.0')
    expect(store.permissions[0]).toMatchObject({ granted: true, decided: true })
  })

  it('reloads when new terms were published meanwhile', async () => {
    const store = useOptionalPermissionsStore()
    await store.load()
    vi.mocked(chooseOptionalPermission).mockRejectedValueOnce(
      new OptionalPermissionsChangedError('x'),
    )
    await expect(store.choose('newsletter', true)).rejects.toThrow()
    expect(fetchOptionalPermissions).toHaveBeenCalledTimes(2)
    expect(store.error).toContain('mudaram')
  })
})
