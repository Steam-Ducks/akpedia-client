import Keycloak from 'keycloak-js'
import { readonly, ref } from 'vue'

/** Realm roles that may see the review queue, approve and return documents. */
const REVIEWER_ROLES = ['APPROVER', 'ADMIN']

/** A token closer than this to expiring is refreshed before it is sent. */
const MIN_VALIDITY_SECONDS = 30

export type SessionUser = {
  name: string
  email: string
  sector: string | null
  /** Realm roles from the token, e.g. ["STANDARD", "APPROVER"]; Keycloak's own ones included. */
  roles: string[]
  canReview: boolean
  /** Publishes the terms of use. */
  isAdmin: boolean
}

type AkpediaToken = {
  name?: string
  preferred_username?: string
  email?: string
  sector?: string
  realm_access?: { roles?: string[] }
}

const keycloak = new Keycloak({
  // Keycloak sits behind the same nginx as the app, under /auth.
  url: import.meta.env.VITE_KEYCLOAK_URL || `${window.location.origin}/auth`,
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'akpedia',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'akpedia-client',
})

const user = ref<SessionUser | null>(null)

/** Who is logged in, or `null` before {@link initAuth} finishes. */
export const sessionUser = readonly(user)

function readUser(): SessionUser | null {
  const token = keycloak.tokenParsed as AkpediaToken | undefined
  if (!token) return null

  const roles = token.realm_access?.roles ?? []
  return {
    name: token.name || token.preferred_username || token.email || '',
    email: token.email ?? '',
    sector: token.sector ?? null,
    roles,
    canReview: roles.some((role) => REVIEWER_ROLES.includes(role)),
    isAdmin: roles.includes('ADMIN'),
  }
}

/**
 * Sends the browser to Keycloak's login page unless there is already a session there, and
 * comes back logged in. The app is mounted only after this resolves.
 */
export async function initAuth(): Promise<void> {
  await keycloak.init({
    onLoad: 'login-required',
    pkceMethod: 'S256',
    // The session-check iframe needs third-party cookies, which browsers now block.
    checkLoginIframe: false,
  })
  user.value = readUser()
  keycloak.onAuthRefreshSuccess = () => {
    user.value = readUser()
  }
}

/**
 * A valid access token, refreshed first when it is about to expire. `null` when nobody is
 * logged in (as in unit tests). If the session is gone, the browser goes back to the login page.
 */
export async function accessToken(): Promise<string | null> {
  if (!keycloak.authenticated) return null

  try {
    await keycloak.updateToken(MIN_VALIDITY_SECONDS)
  } catch {
    await keycloak.login()
    return null
  }
  return keycloak.token ?? null
}

/**
 * Gets a fresh token right away, e.g. after the user changed their name, so that the header and
 * {@link sessionUser} show what Keycloak now holds. If the session is gone, back to the login page.
 */
export async function refreshSession(): Promise<void> {
  if (!keycloak.authenticated) return

  try {
    // -1: refresh whatever the token's validity.
    await keycloak.updateToken(-1)
  } catch {
    await keycloak.login()
    return
  }
  user.value = readUser()
}

/** The server turned the token down: log in again, back to the same page. */
export function loginAgain(): void {
  if (keycloak.authenticated) keycloak.login()
}

/** Ends the session in Keycloak too, and comes back to the home page logged out. */
export function logout(): Promise<void> {
  return keycloak.logout({ redirectUri: window.location.origin })
}
