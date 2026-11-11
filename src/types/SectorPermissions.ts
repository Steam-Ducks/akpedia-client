/** One category column of `GET /api/v1/admin/sector-categories`. */
export type PermissionCategoryDto = {
  id: number
  name: string
  description: string | null
}

/** One sector row, with the categories it may see. */
export type SectorCategoriesDto = {
  id: number
  name: string
  category_ids: number[]
}

export type SectorCategoryMatrixDto = {
  categories: PermissionCategoryDto[]
  sectors: SectorCategoriesDto[]
}

export type PermissionCategory = {
  id: number
  name: string
  description: string | null
}

export type SectorCategories = {
  id: number
  name: string
  categoryIds: number[]
}

/** The categories (columns) against the sectors (rows), in the realm's order. */
export type SectorCategoryMatrix = {
  categories: PermissionCategory[]
  sectors: SectorCategories[]
}
