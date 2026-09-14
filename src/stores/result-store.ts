import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ResultPayload } from '@/types/DocData'

export const useResultStore = defineStore('result', () => {
    const result = ref<ResultPayload | null>(null)

    function setResult(newResult: ResultPayload) {
        result.value = newResult
    }

    return { result, setResult }
})
