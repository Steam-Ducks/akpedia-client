import { defineStore } from 'pinia'
import { ref } from 'vue'
import { analyze, upload, DocumentApiError } from '@/services/documents'
import { fetchCategories } from '@/services/search'
import type { Category } from '@/types/SearchResult'

export type UploadStatus = 'idle' | 'analyzing' | 'review' | 'submitting' | 'submitted'

export const useUploadStore = defineStore('upload', () => {
  const status = ref<UploadStatus>('idle')
  const error = ref<string | null>(null)
  const categories = ref<Category[]>([])

  const file = ref<File | null>(null)
  const categoryId = ref<number | null>(null)
  /** The classifier's own suggestion, kept apart from `categoryId` so a correction is sent as one. */
  const suggestedCategoryId = ref<number | null>(null)
  const categoryConfidence = ref<number | null>(null)
  const name = ref('')
  const description = ref('')

  async function loadCategories() {
    try {
      categories.value = await fetchCategories()
    } catch {
      // The select is still usable once the request that populates it succeeds; retrying is on the user.
      categories.value = []
    }
  }

  function reset() {
    status.value = 'idle'
    error.value = null
    file.value = null
    categoryId.value = null
    suggestedCategoryId.value = null
    categoryConfidence.value = null
    name.value = ''
    description.value = ''
  }

  async function analyzeFile(selected: File) {
    status.value = 'analyzing'
    error.value = null
    file.value = selected

    try {
      const result = await analyze(selected)
      categoryId.value = result.suggestedCategoryId
      suggestedCategoryId.value = result.suggestedCategoryId
      categoryConfidence.value = result.confidence
      name.value = result.title
      description.value = result.description ?? ''
      status.value = 'review'
    } catch (e) {
      if (e instanceof DocumentApiError && e.status === 503) {
        // The classifier is down, but the file itself is fine: let the user fill the form by hand.
        categoryId.value = null
        suggestedCategoryId.value = null
        categoryConfidence.value = null
        name.value = ''
        description.value = ''
        error.value = e.message
        status.value = 'review'
        return
      }

      error.value = e instanceof Error ? e.message : 'Não foi possível ler o arquivo.'
      status.value = 'idle'
    }
  }

  async function submit() {
    if (file.value === null || categoryId.value === null) return

    status.value = 'submitting'
    error.value = null

    try {
      await upload({
        file: file.value,
        categoryId: categoryId.value,
        name: name.value,
        description: description.value,
        suggestedCategoryId: suggestedCategoryId.value,
        categoryConfidence: categoryConfidence.value,
      })
      status.value = 'submitted'
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Não foi possível enviar o documento.'
      status.value = 'review'
    }
  }

  return {
    status,
    error,
    categories,
    file,
    categoryId,
    suggestedCategoryId,
    categoryConfidence,
    name,
    description,
    loadCategories,
    analyze: analyzeFile,
    submit,
    reset,
  }
})
