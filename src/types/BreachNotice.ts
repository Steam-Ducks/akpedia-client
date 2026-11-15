export type BreachNoticeFieldDto = {
  name: string
  required: boolean
  automatic: boolean
  description: string
  example: string
}

export type BreachNoticeTemplateDto = {
  subject: string
  body: string
  fields: BreachNoticeFieldDto[]
}

export type BreachNoticeField = BreachNoticeFieldDto

export type BreachNoticeTemplate = BreachNoticeTemplateDto

export type BreachNoticePreview = {
  subject: string
  body: string
}

/** What the admin fills in; the recipients are everyone, or the Keycloak ids of the people picked. */
export type BreachNoticeDraft = {
  subject: string
  body: string
  fields: Record<string, string>
  recipients: 'all' | string[]
}

export type BreachNoticeFailureDto = {
  user_id: number
  email: string
  reason: string
  error: string
}

export type BreachNoticeSendResultDto = {
  id: number
  total: number
  sent: number
  failed: number
  failures: BreachNoticeFailureDto[]
}

export type BreachNoticeFailure = {
  email: string
  reason: string
  error: string
}

export type BreachNoticeSendResult = {
  id: number
  total: number
  sent: number
  failed: number
  failures: BreachNoticeFailure[]
}

export type BreachNoticeRecipientStatus = 'SENT' | 'FAILED' | 'PENDING'

export type BreachNoticeSummaryDto = {
  id: number
  subject: string
  sent_by_name: string
  anpd_informed: boolean
  sent_at: string
  total: number
  sent: number
  failed: number
  pending: number
}

export type BreachNoticeRecipientDto = {
  user_id: number
  name: string
  email: string
  status: BreachNoticeRecipientStatus
  error: string | null
}

export type BreachNoticeDetailDto = BreachNoticeSummaryDto & {
  body: string
  recipients: BreachNoticeRecipientDto[]
}

export type BreachNoticeSummary = {
  id: number
  subject: string
  sentByName: string
  sentAt: Date
  total: number
  sent: number
  failed: number
  pending: number
}

export type BreachNoticeRecipient = {
  name: string
  email: string
  status: BreachNoticeRecipientStatus
  error: string | null
}

export type BreachNoticeDetail = BreachNoticeSummary & {
  body: string
  recipients: BreachNoticeRecipient[]
}
