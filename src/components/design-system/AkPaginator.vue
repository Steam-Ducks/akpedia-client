<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'

type Props = {
  /** Zero-based current page. */
  page: number
  totalPages: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  change: [page: number]
}>()

const goToPrevious = () => emit('change', props.page - 1)
const goToNext = () => emit('change', props.page + 1)
</script>

<template>
  <div v-if="totalPages > 1" class="ak-paginator">
    <AkButton icon :disabled="page === 0" @click="goToPrevious">
      <ChevronLeft :size="16" />
    </AkButton>
    <span class="text-muted">Página {{ page + 1 }} de {{ totalPages }}</span>
    <AkButton icon :disabled="page >= totalPages - 1" @click="goToNext">
      <ChevronRight :size="16" />
    </AkButton>
  </div>
</template>

<style lang="css" scoped>
.ak-paginator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-3);
}
</style>
