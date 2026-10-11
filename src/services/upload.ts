import type { Category, PreAnalysis, SubmitDocumentInput } from '@/types/Upload'

/**
 * Stands in for the pre-analysis (AKP-46) and submission (AKP-47) routes, which don't exist
 * yet: it mirrors their documented contract (`suggested_category_id`, `category_confidence`,
 * `revision`, `author`, `document_date`) so swapping in the real `fetch` calls is the only
 * change this file will need.
 */

export const CATEGORIES: Category[] = [
  { id: 1, name: 'Tecnico' },
  { id: 2, name: 'Regulatorio' },
  { id: 3, name: 'Juridico' },
  { id: 4, name: 'Qualidade' },
]

const SUPPORTED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt']
const MOCK_DELAY_MS = 1200
const PROGRESS_STEPS = 10

let nextDocumentId = 1000

const extensionOf = (fileName: string): string => {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? '' : fileName.slice(dot).toLowerCase()
}

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const simulateProgress = async (onProgress?: (percent: number) => void): Promise<void> => {
  for (let step = 1; step <= PROGRESS_STEPS; step++) {
    await wait(MOCK_DELAY_MS / PROGRESS_STEPS)
    onProgress?.(Math.round((step / PROGRESS_STEPS) * 100))
  }
}

const baseNameOf = (fileName: string): string => {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? fileName : fileName.slice(0, dot)
}

const randomConfidence = (): number => Math.round((0.7 + Math.random() * 0.29) * 100) / 100

export const preAnalyzeDocument = async (
  file: File,
  onProgress?: (percent: number) => void,
): Promise<PreAnalysis> => {
  await simulateProgress(onProgress)

  const extension = extensionOf(file.name)
  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    const supported = SUPPORTED_EXTENSIONS.join(', ')
    throw new Error(`Formato não suportado para '${file.name}'. Formatos aceitos: ${supported}.`)
  }

  const suggested = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]

  return {
    documentId: nextDocumentId++,
    suggestedCategoryId: suggested.id,
    categoryConfidence: randomConfidence(),
    name: baseNameOf(file.name),
    description: '',
    revision: '',
    author: '',
    documentDate: new Date().toISOString().slice(0, 10),
  }
}

export const submitDocument = async (input: SubmitDocumentInput): Promise<void> => {
  await wait(MOCK_DELAY_MS)

  if (!input.name.trim()) {
    throw new Error('Informe um nome para o documento.')
  }
}
