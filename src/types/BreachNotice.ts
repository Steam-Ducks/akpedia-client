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
