import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSubmissionStore } from '../submission-store'
import type { SubmissionPage } from '@/types/Submission'

const page = (overrides: Partial<SubmissionPage> = {}): SubmissionPage => ({
  content: [
    {
      document_id: 5,
      name: 'manual.pdf',
      description: null,
      category: 'Manuais',
      submission_status: 'PUBLISHED',
      created_at: '2026-10-15T09:00:00Z',
      updated_at: '2026-10-15T18:30:00Z',
    },
  ],
  page: 0,
  size: 10,
  total_elements: 1,
  total_pages: 1,
  ...overrides,
})

describe('submission store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('loads the uploader submissions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => page() }))

    const store = useSubmissionStore()
    await store.load()

    expect(store.status).toBe('done')
    expect(store.submissions).toHaveLength(1)
    expect(store.submissions[0].status).toBe('PUBLISHED')
  })

  it('reports an error without clearing a list already shown', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => page() }))
    const store = useSubmissionStore()
    await store.load()

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => null }),
    )
    await store.load()

    expect(store.status).toBe('error')
    expect(store.submissions).toHaveLength(1)
  })

  it('does not drop back to loading on a background refresh', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => page() }))
    const store = useSubmissionStore()
    await store.load()

    const second = store.load()
    expect(store.status).toBe('done')
    await second
  })

  it('keeps the total pages from the response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => page({ total_pages: 3 }) }),
    )

    const store = useSubmissionStore()
    await store.load()

    expect(store.totalPages).toBe(3)
  })

  it('goToPage loads the requested page and keeps the current filter', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => page() })
    vi.stubGlobal('fetch', fetchMock)

    const store = useSubmissionStore()
    store.categoryIds = [2]
    store.goToPage(1)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost')
    expect(url.searchParams.get('page')).toBe('1')
    expect(url.searchParams.getAll('categoryIds')).toEqual(['2'])
    expect(store.page).toBe(1)
  })

  it('toggling a category goes back to the first page', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => page() })
    vi.stubGlobal('fetch', fetchMock)

    const store = useSubmissionStore()
    store.page = 2

    store.toggleCategory(1)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    expect(store.categoryIds).toEqual([1])
    expect(store.page).toBe(0)
    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost')
    expect(url.searchParams.get('page')).toBe('0')
    expect(url.searchParams.getAll('categoryIds')).toEqual(['1'])
  })

  it('toggling a selected category removes it from the filter', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => page() })
    vi.stubGlobal('fetch', fetchMock)

    const store = useSubmissionStore()
    store.toggleCategory(1)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    store.toggleCategory(1)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    expect(store.categoryIds).toEqual([])
  })

  it('loads the category catalog', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: 1, name: 'Engenharia', description: null }],
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useSubmissionStore()
    await store.loadCategories()

    const url = new URL(fetchMock.mock.calls[0][0], 'http://localhost')
    expect(url.pathname).toBe('/api/v1/categories')
    expect(store.categories).toHaveLength(1)
  })
})
