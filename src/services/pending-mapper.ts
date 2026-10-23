import type { PendingDocumentDto } from '@/types/PendingDocument'

/** Below this, the suggestion is flagged for a closer look instead of being taken at face value. */
export const LOW_CONFIDENCE_THRESHOLD = 0.6

export type PendingDocument = {
  id: number
  name: string
  creatorName: string
  sectorName: string
  submittedAt: Date
  suggestedCategory: string | null
  suggestedCategoryId: number | null
  confidence: number | null
  lowConfidence: boolean
}

export const toPendingDocument = (dto: PendingDocumentDto): PendingDocument => ({
  id: dto.id,
  name: dto.name,
  creatorName: dto.creator_name,
  sectorName: dto.sector_name,
  submittedAt: new Date(dto.created_at),
  suggestedCategory: dto.suggested_category?.name ?? null,
  suggestedCategoryId: dto.suggested_category?.id ?? null,
  confidence: dto.confidence,
  lowConfidence: dto.confidence !== null && dto.confidence < LOW_CONFIDENCE_THRESHOLD,
})
