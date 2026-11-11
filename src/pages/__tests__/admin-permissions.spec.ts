import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AdminPermissionsPage from '../admin/permissions.vue'
import { fetchSectorCategories, updateSectorCategories } from '@/services/sector-permissions'
import type { SectorCategoryMatrix } from '@/types/SectorPermissions'

vi.mock('@/services/sector-permissions', () => ({
  fetchSectorCategories: vi.fn(),
  updateSectorCategories: vi.fn(),
}))

const matrix = (): SectorCategoryMatrix => ({
  categories: [
    { id: 1, name: 'Juridico', description: null },
    { id: 2, name: 'Qualidade', description: null },
    { id: 3, name: 'Regulatorio', description: null },
    { id: 4, name: 'Tecnico', description: null },
  ],
  sectors: [
    { id: 10, name: 'Engenharia', categoryIds: [2, 3, 4] },
    { id: 15, name: 'Recursos Humanos', categoryIds: [1, 3] },
  ],
})

const mountPage = async () => {
  const wrapper = mount(AdminPermissionsPage)
  await flushPromises()
  return wrapper
}

const sectorRow = (wrapper: Awaited<ReturnType<typeof mountPage>>, id: number) =>
  wrapper.get(`.sector-row[data-sector-id="${id}"]`)

const toggle = (wrapper: Awaited<ReturnType<typeof mountPage>>, sector: number, category: number) =>
  sectorRow(wrapper, sector).get(`.permission-toggle[data-category-id="${category}"]`)

describe('admin permissions page', () => {
  beforeEach(() => {
    vi.mocked(fetchSectorCategories).mockResolvedValue(matrix())
  })

  it('shows the sectors by the categories, ticked where the sector sees them', async () => {
    const wrapper = await mountPage()

    expect(wrapper.findAll('thead th').map((th) => th.text())).toEqual([
      'Setor',
      'Juridico',
      'Qualidade',
      'Regulatorio',
      'Tecnico',
      'Ações',
    ])
    expect((toggle(wrapper, 10, 4).element as HTMLInputElement).checked).toBe(true)
    expect((toggle(wrapper, 10, 1).element as HTMLInputElement).checked).toBe(false)
    expect((toggle(wrapper, 15, 1).element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.text()).toContain('a partir da próxima busca')
    expect(sectorRow(wrapper, 10).get('.save-sector').attributes('disabled')).toBeDefined()
  })

  it('saves one sector with what is ticked on its row', async () => {
    vi.mocked(updateSectorCategories).mockResolvedValue({
      id: 15,
      name: 'Recursos Humanos',
      categoryIds: [3],
    })
    const wrapper = await mountPage()

    await toggle(wrapper, 15, 1).trigger('change')
    expect(sectorRow(wrapper, 15).classes()).toContain('dirty')
    expect(sectorRow(wrapper, 10).get('.save-sector').attributes('disabled')).toBeDefined()
    await sectorRow(wrapper, 15).get('.save-sector').trigger('click')
    await flushPromises()

    expect(updateSectorCategories).toHaveBeenCalledWith(15, [3])
    expect(sectorRow(wrapper, 15).classes()).not.toContain('dirty')
    expect(wrapper.text()).toContain('Permissões de Recursos Humanos salvas.')
  })

  it('undoes the changes of a row', async () => {
    const wrapper = await mountPage()

    await toggle(wrapper, 10, 1).trigger('change')
    expect((toggle(wrapper, 10, 1).element as HTMLInputElement).checked).toBe(true)
    await sectorRow(wrapper, 10).get('.discard-sector').trigger('click')

    expect((toggle(wrapper, 10, 1).element as HTMLInputElement).checked).toBe(false)
    expect(sectorRow(wrapper, 10).classes()).not.toContain('dirty')
  })

  it('shows the error when saving fails, keeping the row as ticked', async () => {
    vi.mocked(updateSectorCategories).mockRejectedValue(new Error('Setor 15 não encontrado.'))
    const wrapper = await mountPage()

    await toggle(wrapper, 15, 2).trigger('change')
    await sectorRow(wrapper, 15).get('.save-sector').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Setor 15 não encontrado.')
    expect(sectorRow(wrapper, 15).classes()).toContain('dirty')
  })

  it('offers to try again when loading fails', async () => {
    vi.mocked(fetchSectorCategories).mockRejectedValueOnce(new Error('Sem conexão.'))
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Sem conexão.')
    await wrapper.get('.retry').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.sector-row')).toHaveLength(2)
  })
})
