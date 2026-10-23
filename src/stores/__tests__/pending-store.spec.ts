import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { usePendingStore } from '../pending-store'
import type { PendingDocumentPage } from '@/types/PendingDocument'

const page = (): PendingDocumentPage => ({
  content: [
    {
      id: 12,
      name: 'manual-vpn.pdf',
      creator_name: 'Mariana Costa',
      sector_name: 'Engenharia',
      created_at: '2026-10-13T19:06:15.123Z',
      suggested_category: { id: 1, name: 'Tecnico' },
      confidence: 0.87,
    },
  ],
  page: 0,
  size: 50,
  total_elements: 1,
  total_pages: 1,
})

describe('pending store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('loads the pending documents', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => page() }))

    const store = usePendingStore()
    await store.load()

    expect(store.status).toBe('done')
    expect(store.pendingDocuments).toHaveLength(1)
    expect(store.pendingDocuments[0].suggestedCategory).toBe('Tecnico')
  })

  it('reports an error without clearing a list already shown', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => page() }))
    const store = usePendingStore()
    await store.load()

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => null }),
    )
    await store.load()

    expect(store.status).toBe('error')
    expect(store.pendingDocuments).toHaveLength(1)
  })

  it('does not drop back to loading on a background refresh', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => page() }))
    const store = usePendingStore()
    await store.load()

    const second = store.load()
    expect(store.status).toBe('done')
    await second
  })
})
