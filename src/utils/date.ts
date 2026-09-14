export function formatUpdatedAgo(date: Date): string {
    const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))

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
