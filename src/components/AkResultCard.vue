<script lang="ts" setup>
import { computed } from 'vue'
import { formatUpdatedAgo } from '@/utils/date'
import { ArrowUpRight } from '@lucide/vue'
import type { ResultPayload } from '@/types/DocData'
import { useResultStore } from '@/stores/result-store'
import { storeToRefs } from 'pinia'

type Props = {
  payload: ResultPayload
}

const props = defineProps<Props>()

const router = useRouter()
const resultStore = useResultStore()
const { result: selectedResult } = storeToRefs(resultStore)

const documentData = computed(() => props.payload.documentData)
const updatedAgo = computed(() => formatUpdatedAgo(documentData.value.lastUpdate))
const isSelected = computed(() => selectedResult.value?.documentData.id === documentData.value.id)

function selectResult() {
  resultStore.setResult(props.payload)
}

function openDocument() {
  router.push(`/docs/${documentData.value.id}`)
}
</script>

<template>
  <div class="result-card" :class="{ selected: isSelected }" @click="selectResult">
    <div class="result-header">
      <div class="result-infos">
        <div class="result-badge">
          {{ documentData.category }}
        </div>
      </div>
      <AkButton icon @click.stop="openDocument"> <ArrowUpRight :size="19" /> </AkButton>
    </div>
    <div class="text-title-small">{{ documentData.title }}</div>
    <div class="text-muted result-description">{{ documentData.shortDescription }}</div>
    <div class="result-footer">
      <div class="text-muted">{{ documentData.responsableName }}</div>
      <div class="text-muted">{{ updatedAgo }}</div>
    </div>
  </div>
</template>

<style lang="css" scoped>
.result-card {
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  padding: var(--spacing-4);
  box-shadow: var(--elevation-1);
  background-color: var(--color-white);
  cursor: pointer;

  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);

  transition: all 0.2s ease;
}

.result-card:hover {
  border-color: var(--color-primary-muted);
  box-shadow: var(--elevation-2);
}

.result-card.selected {
  border-color: var(--color-primary);
  box-shadow: var(--elevation-2);
}

.result-infos {
  display: flex;
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  font-weight: 600;
  align-items: center;
  gap: var(--spacing-2);
}

.result-header {
  display: flex;
  justify-content: space-between;
}

.result-badge {
  display: inline-block;
  font-size: var(--font-sm);
  font-weight: 700;
  color: var(--color-primary);
  background-color: var(--color-primary-selected);
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--round-lg);
}

.result-description {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.result-footer {
  font-size: var(--font-sm);
  font-weight: 600;
  display: flex;
  gap: var(--spacing-5);
}
</style>
