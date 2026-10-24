import type { PendingDocumentDto } from '@/types/PendingDocument'

/** Below this, the suggestion is flagged for a closer look instead of being taken at face value. */
export const LOW_CONFIDENCE_THRESHOLD = 0.6

export type PendingDocument = {
  id: number
  name: string
  description: string | null
  creatorName: string
  sectorName: string
  submittedAt: Date
  /** What the author chose, which may differ from the suggestion. */
  categoryId: number
  suggestedCategory: string | null
  suggestedCategoryId: number | null
  confidence: number | null
  lowConfidence: boolean
}

export const toPendingDocument = (dto: PendingDocumentDto): PendingDocument => ({
  id: dto.id,
  name: dto.name,
  description: dto.description,
  creatorName: dto.creator_name,
  sectorName: dto.sector_name,
  submittedAt: new Date(dto.created_at),
  categoryId: dto.category.id,
  suggestedCategory: dto.suggested_category?.name ?? null,
  suggestedCategoryId: dto.suggested_category?.id ?? null,
  confidence: dto.confidence,
  lowConfidence: dto.confidence !== null && dto.confidence < LOW_CONFIDENCE_THRESHOLD,
})
