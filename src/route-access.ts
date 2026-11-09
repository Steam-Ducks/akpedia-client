import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /**
     * Realm roles that may open the page; any one of them is enough. Declared on the page with
     * `definePage({ meta: { roles } })`. A page without it is open to anyone logged in.
     */
    roles?: string[]
  }
}

export const NO_PERMISSION_PATH = '/no-permission'

/**
 * Where to send someone who opens `to`: the "no permission" page, with the address they tried,
 * when none of their roles may open it; `undefined` to let them through. The server refuses the
 * page's calls anyway; this only explains it.
 */
export function accessRedirect(
  to: Pick<RouteLocationNormalized, 'meta' | 'fullPath'>,
  userRoles: readonly string[],
): RouteLocationRaw | undefined {
  const allowed = to.meta.roles
  if (!allowed?.length || allowed.some((role) => userRoles.includes(role))) return undefined
  return { path: NO_PERMISSION_PATH, query: { from: to.fullPath } }
}
