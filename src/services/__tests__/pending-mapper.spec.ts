import { describe, it, expect } from 'vitest'
import { toPendingDocument } from '../pending-mapper'
import type { PendingDocumentDto } from '@/types/PendingDocument'

describe('toPendingDocument', () => {
  it('maps a document with a confident suggestion', () => {
    const dto: PendingDocumentDto = {
      id: 12,
      name: 'manual-vpn.pdf',
      creator_name: 'Mariana Costa',
      sector_name: 'Engenharia',
      created_at: '2026-10-13T19:06:15.123Z',
      suggested_category: { id: 1, name: 'Tecnico' },
      confidence: 0.87,
    }

    const document = toPendingDocument(dto)

    expect(document).toEqual({
      id: 12,
      name: 'manual-vpn.pdf',
      creatorName: 'Mariana Costa',
      sectorName: 'Engenharia',
      submittedAt: new Date('2026-10-13T19:06:15.123Z'),
      suggestedCategory: 'Tecnico',
      confidence: 0.87,
      lowConfidence: false,
    })
  })

  it('flags a suggestion below the threshold as low confidence', () => {
    const dto: PendingDocumentDto = {
      id: 15,
      name: 'politica-ferias.pdf',
      creator_name: 'Usuário padrão',
      sector_name: 'Administrativo',
      created_at: '2026-10-14T11:20:02.481Z',
      suggested_category: { id: 3, name: 'Legal' },
      confidence: 0.4,
    }

    expect(toPendingDocument(dto).lowConfidence).toBe(true)
  })

  it('carries no suggestion and no confidence when the upload had none', () => {
    const dto: PendingDocumentDto = {
      id: 16,
      name: 'relatorio.pdf',
      creator_name: 'Usuário padrão',
      sector_name: 'Administrativo',
      created_at: '2026-10-14T11:20:02.481Z',
      suggested_category: null,
      confidence: null,
    }

    const document = toPendingDocument(dto)

    expect(document.suggestedCategory).toBeNull()
    expect(document.confidence).toBeNull()
    expect(document.lowConfidence).toBe(false)
  })
})
