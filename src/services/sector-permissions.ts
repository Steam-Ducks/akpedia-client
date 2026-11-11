import { jsonBody, sendJson } from '@/services/profile'
import type {
  SectorCategories,
  SectorCategoriesDto,
  SectorCategoryMatrix,
  SectorCategoryMatrixDto,
} from '@/types/SectorPermissions'

export const toSectorCategories = (dto: SectorCategoriesDto): SectorCategories => ({
  id: dto.id,
  name: dto.name,
  categoryIds: [...dto.category_ids],
})

/** Every category against the sectors, with the categories each sector may see. */
export async function fetchSectorCategories(): Promise<SectorCategoryMatrix> {
  const matrix = await sendJson<SectorCategoryMatrixDto>(
    '/api/v1/admin/sector-categories',
    {},
    'Não foi possível carregar as permissões',
  )
  return {
    categories: matrix.categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description ?? null,
    })),
    sectors: matrix.sectors.map(toSectorCategories),
  }
}

/** The sector sees exactly these categories from its users' next search on. */
export async function updateSectorCategories(
  sectorId: number,
  categoryIds: number[],
): Promise<SectorCategories> {
  const sector = await sendJson<SectorCategoriesDto>(
    `/api/v1/admin/sectors/${sectorId}/categories`,
    jsonBody('PUT', { category_ids: categoryIds }),
    'Não foi possível salvar as permissões do setor',
  )
  return toSectorCategories(sector)
}
