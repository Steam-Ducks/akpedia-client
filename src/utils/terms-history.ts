import type { TermsHistoryAction } from '@/types/Terms'

/** How each action of the terms history reads in the admin's table. */
export const TERMS_HISTORY_ACTION_LABELS: Record<TermsHistoryAction, string> = {
  accepted: 'Aceitou',
  updated: 'Atualizou',
  declined: 'Recusou',
}
