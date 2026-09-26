import type { ResultPayload } from '@/types/DocData'
import type { DocumentSummary, SearchResult } from '@/types/SearchResult'

export function toResultPayload(result: DocumentSummary | SearchResult): ResultPayload {
  const match = 'score' in result ? result : null

  return {
    documentData: {
      id: result.document_id,
      title: result.name,
      shortDescription: result.description ?? match?.matched_chunk ?? result.excerpt ?? '',
      category: result.category,
      responsableName: result.responsible_name,
      lastUpdate: new Date(result.updated_at),
    },
    accuracy: match?.score,
  }
}
