import { describe, it, expect } from 'vitest'
import { accessRedirect, NO_PERMISSION_PATH } from '@/route-access'

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
