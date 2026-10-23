import { API_BASE_URL } from '@/config/api'
import type { ApiError } from '@/types/SearchResult'

/** Corrections the approver makes while approving; a field left out keeps what the author sent. */
export type ApproveCorrections = {
  name?: string
  description?: string
  categoryId?: number
}

async function postJson(path: string, body: unknown, failure: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiError | null
    throw new Error(error?.message ?? `${failure} (HTTP ${response.status}).`)
  }
}

/** Approves a `PENDING_APPROVAL` document and queues it for indexing. */
export const approveDocument = (documentId: number, corrections: ApproveCorrections): Promise<void> =>
  postJson(`/api/v1/documents/${documentId}/approve`, corrections, 'A aprovação falhou')

/** Returns a `PENDING_APPROVAL` document to its author with the reason. */
export const rejectDocument = (documentId: number, comment: string): Promise<void> =>
  postJson(`/api/v1/documents/${documentId}/reject`, { comment }, 'A devolução falhou')
