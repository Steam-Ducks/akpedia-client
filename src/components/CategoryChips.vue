<script setup lang="ts">
import type { Category } from '@/types/SearchResult'

type Props = {
  categories: Category[]
  selectedIds: number[]
}

defineProps<Props>()

const emit = defineEmits<{
  toggle: [id: number]
}>()
</script>

<template>
  <div class="category-chips">
    <AkChip
      v-for="category in categories"
      :key="category.id"
      :selected="selectedIds.includes(category.id)"
      @click="emit('toggle', category.id)"
    >
      {{ category.name }}
    </AkChip>
  </div>
</template>

<style lang="css" scoped>
.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}
</style>
