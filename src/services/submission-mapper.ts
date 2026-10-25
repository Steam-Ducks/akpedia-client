import type { SubmissionDto, SubmissionStatus } from '@/types/Submission'

export type Submission = {
  documentId: number
  name: string
  description: string | null
  category: string
  status: SubmissionStatus
  submittedAt: Date
  reviewComment?: string
}

export const toSubmission = (dto: SubmissionDto): Submission => ({
  documentId: dto.document_id,
  name: dto.name,
  description: dto.description,
  category: dto.category,
  status: dto.submission_status,
  submittedAt: new Date(dto.created_at),
  reviewComment: dto.review_comment,
})
