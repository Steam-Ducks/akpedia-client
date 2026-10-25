import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchSubmissions } from '@/services/submissions'
import { toSubmission, type Submission } from '@/services/submission-mapper'
import { fetchCategories } from '@/services/search'
import type { Category } from '@/types/SearchResult'

type SubmissionListStatus = 'idle' | 'loading' | 'done' | 'error'

export const useSubmissionStore = defineStore('submission', () => {
  const submissions = ref<Submission[]>([])
  const status = ref<SubmissionListStatus>('idle')
  const error = ref<string | null>(null)
  const page = ref(0)
  const totalPages = ref(0)
  /** Categories the listing is narrowed to; empty means every category. */
  const categoryIds = ref<number[]>([])
  /** The whole category catalog, to populate the filter. */
  const categories = ref<Category[]>([])

  /** Guards against an older, slower request overwriting the result of a newer one. */
  let latestRequest = 0

  const load = async () => {
    const request = ++latestRequest
    if (status.value === 'idle') status.value = 'loading'
    error.value = null

    try {
      const found = await fetchSubmissions(page.value, categoryIds.value)
      if (request !== latestRequest) return
      submissions.value = found.content.map(toSubmission)
      totalPages.value = found.total_pages
      status.value = 'done'
    } catch (e) {
      if (request !== latestRequest) return
      error.value = e instanceof Error ? e.message : 'Não foi possível carregar suas submissões.'
      status.value = 'error'
    }
  }

  const loadCategories = async () => {
    try {
      categories.value = await fetchCategories()
    } catch {
      // The filter is only a convenience; the page still works without it.
      categories.value = []
    }
  }

  const goToPage = (newPage: number) => {
    page.value = newPage
    load()
  }

  /** Adds or removes a category from the filter, then goes back to the first page. */
  const toggleCategory = (id: number) => {
    categoryIds.value = categoryIds.value.includes(id)
      ? categoryIds.value.filter((existing) => existing !== id)
      : [...categoryIds.value, id]
    page.value = 0
    load()
  }

  return {
    submissions,
    status,
    error,
    page,
    totalPages,
    categoryIds,
    categories,
    load,
    loadCategories,
    goToPage,
    toggleCategory,
  }
})
