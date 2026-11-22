import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchSectorCategories, updateSectorCategories } from '@/services/sector-permissions'
import { apiFetch } from '@/services/api'

vi.mock('@/services/api', () => ({ apiFetch: vi.fn() }))

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('sector permissions service', () => {
  beforeEach(() => vi.mocked(apiFetch).mockReset())

  it('reads the matrix into camelCase', async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      json({
        categories: [{ id: 1, name: 'Juridico', description: 'Documentos juridicos' }],
        sectors: [{ id: 10, name: 'Jurídico', category_ids: [1] }],
      }),
    )

    expect(await fetchSectorCategories()).toEqual({
      categories: [{ id: 1, name: 'Juridico', description: 'Documentos juridicos' }],
      sectors: [{ id: 10, name: 'Jurídico', categoryIds: [1] }],
    })
    expect(apiFetch).toHaveBeenCalledWith('/api/v1/admin/sector-categories', {})
  })

  it("puts a sector's categories in snake_case", async () => {
    vi.mocked(apiFetch).mockResolvedValue(json({ id: 10, name: 'Jurídico', category_ids: [1, 3] }))

    expect(await updateSectorCategories(10, [1, 3])).toEqual({
      id: 10,
      name: 'Jurídico',
      categoryIds: [1, 3],
    })
    const [path, init] = vi.mocked(apiFetch).mock.calls[0]
    expect(path).toBe('/api/v1/admin/sectors/10/categories')
    expect(init?.method).toBe('PUT')
    expect(JSON.parse(String(init?.body))).toEqual({ category_ids: [1, 3] })
  })

  it("shows the server's message for an error it does not know", async () => {
    vi.mocked(apiFetch).mockResolvedValue(
      json({ code: 'sector_not_found', message: 'Setor 99 não encontrado.' }, 404),
    )

    await expect(updateSectorCategories(99, [])).rejects.toThrow('Setor 99 não encontrado.')
  })
})
