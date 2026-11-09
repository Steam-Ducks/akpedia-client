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

export const ACCEPT_TERMS_PATH = '/accept-terms'

/** The address in `from`, when it is a page of the app other than the terms page itself. */
const returnPath = (from: unknown): string | undefined =>
  typeof from === 'string' &&
  from.startsWith('/') &&
  !from.startsWith('//') &&
  !from.startsWith(ACCEPT_TERMS_PATH)
    ? from
    : undefined

/**
 * Where the terms of use send someone who opens `to`: while the current terms are pending, the
 * terms page, keeping the address they tried in `from`; once accepted (or when there is nothing
 * to accept), out of the terms page, back to that address or to the home page. `undefined` to let
 * them through.
 */
export function termsRedirect(
  to: Pick<RouteLocationNormalized, 'path' | 'fullPath' | 'query'>,
  termsPending: boolean,
): RouteLocationRaw | undefined {
  const onTermsPage = to.path === ACCEPT_TERMS_PATH
  if (termsPending) {
    return onTermsPage ? undefined : { path: ACCEPT_TERMS_PATH, query: { from: to.fullPath } }
  }
  return onTermsPage ? (returnPath(to.query.from) ?? '/') : undefined
}
