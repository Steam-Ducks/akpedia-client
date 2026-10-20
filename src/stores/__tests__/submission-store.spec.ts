import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSubmissionStore } from '../submission-store'
import type { SubmissionPage } from '@/types/Submission'

const page = (): SubmissionPage => ({
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
  size: 50,
  total_elements: 1,
  total_pages: 1,
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
})
