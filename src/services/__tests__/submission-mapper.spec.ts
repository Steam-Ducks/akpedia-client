import { describe, it, expect } from 'vitest'
import { toSubmission } from '../submission-mapper'
import type { SubmissionDto } from '@/types/Submission'

describe('toSubmission', () => {
  it('maps a published submission', () => {
    const dto: SubmissionDto = {
      document_id: 5,
      name: 'manual.pdf',
      description: 'manual técnico',
      category: 'Manuais',
      submission_status: 'PUBLISHED',
      created_at: '2026-10-15T09:00:00Z',
      updated_at: '2026-10-15T18:30:00Z',
    }

    const submission = toSubmission(dto)

    expect(submission).toEqual({
      documentId: 5,
      name: 'manual.pdf',
      category: 'Manuais',
      status: 'PUBLISHED',
      submittedAt: new Date('2026-10-15T09:00:00Z'),
      reviewComment: undefined,
    })
  })

  it('carries the review comment for a returned submission', () => {
    const dto: SubmissionDto = {
      document_id: 7,
      name: 'contrato.pdf',
      description: null,
      category: 'Juridico',
      submission_status: 'RETURNED',
      review_comment: 'Falta a seção de revisão A.',
      reviewed_at: '2026-10-16T12:00:00Z',
      created_at: '2026-10-16T11:20:00Z',
      updated_at: null,
    }

    const submission = toSubmission(dto)

    expect(submission.status).toBe('RETURNED')
    expect(submission.reviewComment).toBe('Falta a seção de revisão A.')
  })
})
