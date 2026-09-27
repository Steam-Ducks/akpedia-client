import type { DocumentSummary, SearchResult } from '@/types/SearchResult'

// TODO: mocked until the screen is wired to the API.

const DAY = 24 * 60 * 60 * 1000

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY).toISOString()
}

const MOCK_DOCUMENTS: DocumentSummary[] = [
  {
    document_id: 1,
    name: 'Manual de Integração do Sistema de Navegação',
    description:
      'Procedimentos para integração, configuração e validação do sistema de navegação embarcado.',
    mime_type: 'application/pdf',
    category: 'Técnica',
    responsible_name: 'Mariana Costa',
    updated_at: daysAgo(2),
  },
  {
    document_id: 2,
    name: 'Diretriz de Gestão de Riscos de Projeto',
    description:
      'Diretrizes para identificar, avaliar, tratar e acompanhar riscos ao longo do ciclo do projeto.',
    mime_type: 'application/pdf',
    category: 'Normativa',
    responsible_name: 'Rafael Mendes',
    updated_at: daysAgo(5),
  },
  {
    document_id: 3,
    name: 'Termo de Confidencialidade — Fornecedores',
    description:
      'Modelo padrão para formalização de confidencialidade com fornecedores e parceiros estratégicos.',
    mime_type: 'application/pdf',
    category: 'Jurídica',
    responsible_name: 'Luiza Araújo',
    updated_at: daysAgo(7),
  },
]

const MOCK_SCORES = [0.98, 0.95, 0.91]

/** Simulates the round trip, so the loading state shows. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function searchDocuments(query: string): Promise<SearchResult[]> {
  await delay(300)
  return MOCK_DOCUMENTS.map((document, index) => ({
    ...document,
    score: MOCK_SCORES[index],
    matched_chunk: `Trecho do documento que corresponde a "${query}".`,
    chunk_index: 0,
  }))
}

export async function fetchRecentDocuments(): Promise<DocumentSummary[]> {
  await delay(300)
  return MOCK_DOCUMENTS
}
