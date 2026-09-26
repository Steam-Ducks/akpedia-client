<script setup lang="ts">
import { computed } from 'vue'
import { useResultStore } from '@/stores/result-store'
import { storeToRefs } from 'pinia'

const resultStore = useResultStore()
const { result: payload } = storeToRefs(resultStore)

const computedAccuracy = computed(() =>
    payload.value?.accuracy === undefined ? null : Math.round(payload.value.accuracy * 100),
)
</script>

<template>
    <div class="ak-result-overview">
        <template v-if="payload">

            <div class="overview-descriptors">
                <div class="text-title-small">{{ payload.documentData.title }}</div>
                <div class="text-muted">{{ payload.documentData.shortDescription }}</div>
            </div>
            <div class="overview-details">
                <div class="details-line">
                    <div class="text-muted">Categoria</div>
                    <div class="text-bold">{{ payload.documentData.category }}</div>
                </div>
                <div class="details-line">
                    <div class="text-muted">Responsável</div>
                    <div class="text-bold">{{ payload.documentData.responsableName }}</div>
                </div>
                <div v-if="computedAccuracy !== null" class="details-line">
                    <div class="text-muted">Relevância</div>
                    <div class="text-bold text-highlight">{{ computedAccuracy }}% de Relevância</div>
                </div>
            </div>
            <AkButton class="result-button" color="primary">Abrir documento</AkButton>
        </template>
    </div>
</template>

<style lang="css" scoped>
.ak-result-overview {
    position: sticky;
    top: var(--spacing-4);
    width: 300px;
    border: 1px solid var(--color-border);
    background-color: var(--color-foreground);
    padding: var(--spacing-4);
    border-radius: var(--round-lg);
}

.overview-descriptors {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    padding-bottom: var(--spacing-3);
    border-bottom: 1px solid var(--color-border);
    margin-bottom: var(--spacing-3);
}


.overview-details {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
}
.details-line {
    display: flex;
    justify-content: space-between;
}
.result-button {
    margin-top: var(--spacing-8);
    width: 100%;
}
</style>
