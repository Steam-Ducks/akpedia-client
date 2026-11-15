import { apiFetch } from '@/services/api'
import type {
  BreachNoticeDraft,
  BreachNoticePreview,
  BreachNoticeSendResult,
  BreachNoticeSendResultDto,
  BreachNoticeTemplate,
} from '@/types/BreachNotice'
import type { ApiError } from '@/types/SearchResult'

const BASE = '/api/v1/admin/breach-notices'

async function send<T>(path: string, init: RequestInit, failure: string): Promise<T> {
  const response = await apiFetch(path, init)

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiError | null
    throw new Error(error?.message || `${failure} (HTTP ${response.status}).`)
  }

  return (await response.json()) as T
}

const postJson = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

const toBody = (draft: BreachNoticeDraft) => ({
  subject: draft.subject,
  body: draft.body,
  fields: draft.fields,
})

/** The template's subject and text, and the fields of the text with what goes in each. */
export const fetchBreachNoticeTemplate = (): Promise<BreachNoticeTemplate> =>
  send<BreachNoticeTemplate>(`${BASE}/template`, {}, 'Não foi possível carregar o modelo do aviso')

/** The e-mail as a recipient will read it. Needs neither recipients nor the ANPD confirmation. */
export const previewBreachNotice = (draft: BreachNoticeDraft): Promise<BreachNoticePreview> =>
  send<BreachNoticePreview>(
    `${BASE}/preview`,
    postJson(toBody(draft)),
    'Não foi possível gerar a pré-visualização',
  )

/** Sends the notice, once the administrator confirmed ANPD was informed. */
export async function sendBreachNotice(draft: BreachNoticeDraft): Promise<BreachNoticeSendResult> {
  const result = await send<BreachNoticeSendResultDto>(
    BASE,
    postJson({
      ...toBody(draft),
      ...(draft.recipients === 'all' ? { all_users: true } : { keycloak_ids: draft.recipients }),
      anpd_informed: true,
    }),
    'Não foi possível enviar o aviso',
  )
  return {
    id: result.id,
    total: result.total,
    sent: result.sent,
    failed: result.failed,
    failures: result.failures.map(({ email, reason, error }) => ({ email, reason, error })),
  }
}
