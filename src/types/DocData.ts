export type DocData = {
    title: string
    category: string
    docName: string
    shortDescription: string
    responsableName: string
    lastUpdate: Date
}

export type ResultPayload = {
    documentData: DocData
    accuracy: number
}