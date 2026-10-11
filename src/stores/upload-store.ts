import { defineStore } from 'pinia'
import { ref } from 'vue'
import { CATEGORIES, preAnalyzeDocument, submitDocument } from '@/services/upload'
import type { Category } from '@/types/Upload'

export type UploadStatus = 'idle' | 'analyzing' | 'review' | 'submitting' | 'submitted' | 'error'

export const useUploadStore = defineStore('upload', () => {
  const status = ref<UploadStatus>('idle')
  const progress = ref(0)
  const error = ref<string | null>(null)

  const documentId = ref<number | null>(null)
  const categoryId = ref<number | null>(null)
  const categoryConfidence = ref<number | null>(null)
  const name = ref('')
  const description = ref('')
  const revision = ref('')
  const author = ref('')
  const documentDate = ref('')

  const categories: Category[] = CATEGORIES

  const reset = () => {
    status.value = 'idle'
    progress.value = 0
    error.value = null
    documentId.value = null
    categoryId.value = null
    categoryConfidence.value = null
    name.value = ''
    description.value = ''
    revision.value = ''
    author.value = ''
    documentDate.value = ''
  }

  const analyze = async (file: File) => {
    status.value = 'analyzing'
    progress.value = 0
    error.value = null

    try {
      const result = await preAnalyzeDocument(file, (percent) => {
        progress.value = percent
      })
      documentId.value = result.documentId
      categoryId.value = result.suggestedCategoryId
      categoryConfidence.value = result.categoryConfidence
      name.value = result.name
      description.value = result.description
      revision.value = result.revision
      author.value = result.author
      documentDate.value = result.documentDate
      status.value = 'review'
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Não foi possível ler o arquivo.'
      status.value = 'idle'
    }
  }

  const submit = async () => {
    if (documentId.value === null || categoryId.value === null) return

    status.value = 'submitting'
    error.value = null

    try {
      await submitDocument({
        documentId: documentId.value,
        categoryId: categoryId.value,
        name: name.value,
        description: description.value,
        revision: revision.value,
        author: author.value,
        documentDate: documentDate.value,
      })
      status.value = 'submitted'
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Não foi possível enviar o documento.'
      status.value = 'review'
    }
  }

  return {
    status,
    progress,
    error,
    categories,
    documentId,
    categoryId,
    categoryConfidence,
    name,
    description,
    revision,
    author,
    documentDate,
    analyze,
    submit,
    reset,
  }
})
