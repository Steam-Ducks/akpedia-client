import type { Page, PageDto } from '@/types/Page'

export const toPage = <D, T>(dto: PageDto<D>, map: (item: D) => T): Page<T> => ({
  content: dto.content.map(map),
  page: dto.page,
  size: dto.size,
  totalElements: dto.total_elements,
  totalPages: dto.total_pages,
})
