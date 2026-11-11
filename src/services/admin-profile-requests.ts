import { toPage } from '@/services/page-mapper'
import { jsonBody, sendJson, toChangeRequest } from '@/services/profile'
import type { Page, PageDto } from '@/types/Page'
import type { ChangeRequest, ChangeRequestDto, ChangeRequestStatusFilter } from '@/types/Profile'

const DEFAULT_PAGE_SIZE = 20

export type ProfileRequestQuery = {
  status?: ChangeRequestStatusFilter
  page?: number
  size?: number
}

/** The users' e-mail/CPF change requests, pending ones by default, with who asked. */
export async function fetchProfileRequests({
  status = 'PENDING',
  page = 0,
  size = DEFAULT_PAGE_SIZE,
}: ProfileRequestQuery = {}): Promise<Page<ChangeRequest>> {
  const params = new URLSearchParams({ status, page: String(page), size: String(size) })
  const requests = await sendJson<PageDto<ChangeRequestDto>>(
    `/api/v1/admin/profile-requests?${params}`,
    {},
    'Não foi possível carregar as solicitações',
  )
  return toPage(requests, toChangeRequest)
}

/** Applies the new e-mail or CPF in Keycloak. 409 `user_exists` if the e-mail was taken since. */
export async function approveProfileRequest(id: number): Promise<ChangeRequest> {
  const request = await sendJson<ChangeRequestDto>(
    `/api/v1/admin/profile-requests/${id}/approve`,
    { method: 'POST' },
    'Não foi possível aprovar a solicitação',
  )
  return toChangeRequest(request)
}

/** Turns the request down; the note, if any, is shown to the user. */
export async function rejectProfileRequest(id: number, note?: string): Promise<ChangeRequest> {
  const request = await sendJson<ChangeRequestDto>(
    `/api/v1/admin/profile-requests/${id}/reject`,
    jsonBody('POST', { note: note?.trim() || null }),
    'Não foi possível recusar a solicitação',
  )
  return toChangeRequest(request)
}
