import { describe, it, expect } from 'vitest'
import { toPendingDocument } from '../pending-mapper'
import type { PendingDocumentDto } from '@/types/PendingDocument'

describe('toPendingDocument', () => {
  it('maps a document with what the author sent and a confident suggestion', () => {
    const dto: PendingDocumentDto = {
      id: 12,
      name: 'manual-vpn.pdf',
      description: 'Como configurar a VPN',
      creator_name: 'Mariana Costa',
      sector_name: 'Engenharia',
      created_at: '2026-10-13T19:06:15.123Z',
      category: { id: 2, name: 'Regulatorio' },
      suggested_category: { id: 1, name: 'Tecnico' },
      confidence: 0.87,
    }

    const document = toPendingDocument(dto)

    expect(document).toEqual({
      id: 12,
      name: 'manual-vpn.pdf',
      description: 'Como configurar a VPN',
      creatorName: 'Mariana Costa',
      sectorName: 'Engenharia',
      submittedAt: new Date('2026-10-13T19:06:15.123Z'),
      categoryId: 2,
      suggestedCategory: 'Tecnico',
      suggestedCategoryId: 1,
      confidence: 0.87,
      lowConfidence: false,
    })
  })

  it('flags a suggestion below the threshold as low confidence', () => {
    const dto: PendingDocumentDto = {
      id: 15,
      name: 'politica-ferias.pdf',
      description: null,
      creator_name: 'Usuário padrão',
      sector_name: 'Administrativo',
      created_at: '2026-10-14T11:20:02.481Z',
      category: { id: 1, name: 'Tecnico' },
      suggested_category: { id: 3, name: 'Legal' },
      confidence: 0.4,
    }

    expect(toPendingDocument(dto).lowConfidence).toBe(true)
  })

  it('carries no suggestion and no confidence when the upload had none', () => {
    const dto: PendingDocumentDto = {
      id: 16,
      name: 'relatorio.pdf',
      description: null,
      creator_name: 'Usuário padrão',
      sector_name: 'Administrativo',
      created_at: '2026-10-14T11:20:02.481Z',
      category: { id: 1, name: 'Tecnico' },
      suggested_category: null,
      confidence: null,
    }

    const document = toPendingDocument(dto)

    expect(document.suggestedCategory).toBeNull()
    expect(document.suggestedCategoryId).toBeNull()
    expect(document.confidence).toBeNull()
    expect(document.lowConfidence).toBe(false)
  })
})
