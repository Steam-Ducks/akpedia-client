import { describe, it, expect } from 'vitest'
import {
  ACCEPT_TERMS_PATH,
  accessRedirect,
  NO_PERMISSION_PATH,
  termsRedirect,
} from '@/route-access'

const route = (roles: string[] | undefined, fullPath = '/admin/users?page=2') => ({
  meta: roles ? { roles } : {},
  fullPath,
})

describe('accessRedirect', () => {
  it('lets anyone open a page that declares no roles', () => {
    expect(accessRedirect(route(undefined, '/upload'), [])).toBeUndefined()
    expect(accessRedirect(route([], '/upload'), ['STANDARD'])).toBeUndefined()
  })

  it('lets through a user with any of the page roles', () => {
    expect(accessRedirect(route(['APPROVER', 'ADMIN'], '/review'), ['STANDARD', 'ADMIN'])).toBe(
      undefined,
    )
    expect(accessRedirect(route(['ADMIN']), ['ADMIN'])).toBeUndefined()
  })

  it('sends anyone else to the no-permission page, with the address they tried', () => {
    expect(accessRedirect(route(['ADMIN']), ['STANDARD', 'APPROVER'])).toEqual({
      path: NO_PERMISSION_PATH,
      query: { from: '/admin/users?page=2' },
    })
    expect(accessRedirect(route(['APPROVER', 'ADMIN'], '/review/7'), [])).toEqual({
      path: NO_PERMISSION_PATH,
      query: { from: '/review/7' },
    })
  })
})

describe('termsRedirect', () => {
  const at = (fullPath: string) => {
    const url = new URL(fullPath, 'http://localhost')
    return { path: url.pathname, fullPath, query: Object.fromEntries(url.searchParams) }
  }

  it('sends to the terms page while they are pending, keeping the address tried', () => {
    expect(termsRedirect(at('/review?page=2'), true)).toEqual({
      path: ACCEPT_TERMS_PATH,
      query: { from: '/review?page=2' },
    })
  })

  it('keeps the user on the terms page while they are pending', () => {
    expect(termsRedirect(at('/accept-terms?from=%2Freview'), true)).toBeUndefined()
  })

  it('lets any page open once the terms are accepted', () => {
    expect(termsRedirect(at('/review'), false)).toBeUndefined()
  })

  it('leaves the terms page for the address tried, once accepted', () => {
    expect(termsRedirect(at('/accept-terms?from=%2Freview%3Fpage%3D2'), false)).toBe(
      '/review?page=2',
    )
  })

  it('leaves the terms page for the home page when the address is missing or not the app', () => {
    expect(termsRedirect(at('/accept-terms'), false)).toBe('/')
    expect(termsRedirect(at('/accept-terms?from=https%3A%2F%2Fevil.example'), false)).toBe('/')
    expect(termsRedirect(at('/accept-terms?from=%2F%2Fevil.example'), false)).toBe('/')
    expect(termsRedirect(at('/accept-terms?from=%2Faccept-terms'), false)).toBe('/')
  })
})
