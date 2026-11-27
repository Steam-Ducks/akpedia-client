import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  chooseOptionalPermission,
  fetchOptionalPermissions,
  OptionalPermissionsChangedError,
} from '@/services/optional-permissions'
import type { UserOptionalPermission } from '@/types/OptionalPermissions'

/**
 * The user's choices for the optional permissions of the current terms, chosen when accepting them
 * and changed any time on the account page. Saying no never blocks anything.
 */
export const useOptionalPermissionsStore = defineStore('optional-permissions', () => {
  const version = ref<string | null>(null)
  const permissions = ref<UserOptionalPermission[]>([])
  const status = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
  const error = ref<string | null>(null)

  const load = async () => {
    if (status.value !== 'done') status.value = 'loading'
    try {
      const set = await fetchOptionalPermissions()
      version.value = set.version
      permissions.value = set.permissions
      error.value = null
      status.value = 'done'
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : 'Não foi possível carregar as permissões opcionais.'
      if (status.value !== 'done') status.value = 'error'
    }
  }

  /**
   * Saves one choice for the version on screen. If new terms were published meanwhile, the new
   * version loads and the error says so.
   */
  const choose = async (id: string, granted: boolean) => {
    if (version.value === null) return
    error.value = null
    try {
      await chooseOptionalPermission(id, granted, version.value)
      const permission = permissions.value.find((p) => p.id === id)
      if (permission) Object.assign(permission, { granted, decided: true, decidedAt: new Date() })
    } catch (e) {
      if (e instanceof OptionalPermissionsChangedError) {
        await load()
        error.value = 'Os termos de uso mudaram. Confira a nova versão.'
      } else {
        error.value = e instanceof Error ? e.message : 'Não foi possível salvar a sua escolha.'
      }
      throw e
    }
  }

  return { version, permissions, status, error, load, choose }
})
