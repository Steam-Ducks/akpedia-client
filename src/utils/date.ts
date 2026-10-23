/** How long ago `date` was, as "hoje", "há N dia(s)" and so on, for a waiting-time column. */
export const formatRelativeDays = (date: Date): string => {
  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'hoje'
  if (diffDays < 30) return `há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `há ${diffMonths} ${diffMonths === 1 ? 'mês' : 'meses'}`
  const diffYears = Math.floor(diffDays / 365)
  return `há ${diffYears} ${diffYears === 1 ? 'ano' : 'anos'}`
}

export function formatUpdatedAgo(date: Date): string {
  const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'atualizado hoje'
  }

  if (diffDays < 30) {
    return `atualizado há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`
  }

  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) {
    return `atualizado há ${diffMonths} ${diffMonths === 1 ? 'mês' : 'meses'}`
  }

  const diffYears = Math.floor(diffDays / 365)
  return `atualizado há ${diffYears} ${diffYears === 1 ? 'ano' : 'anos'}`
}
