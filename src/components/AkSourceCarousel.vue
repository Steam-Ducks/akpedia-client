<script setup lang="ts">
import type { ChatSourceDetails } from '@/types/Chat'

const SOURCES_PER_ROW = 5

type Props = {
  sources: ChatSourceDetails[]
}

const props = defineProps<Props>()

const emit = defineEmits<{ toggle: [expanded: boolean] }>()

const expanded = ref(false)

const rows = computed(() =>
  Array.from({ length: Math.ceil(props.sources.length / SOURCES_PER_ROW) }, (_, index) =>
    props.sources.slice(index * SOURCES_PER_ROW, (index + 1) * SOURCES_PER_ROW),
  ),
)
const visibleRows = computed(() => (expanded.value ? rows.value : rows.value.slice(0, 1)))
const hiddenCount = computed(() => Math.max(0, props.sources.length - SOURCES_PER_ROW))

watch(expanded, async (value) => {
  await nextTick()
  emit('toggle', value)
})
</script>

<template>
  <div class="source-carousel">
    <AkSourceRow v-for="(row, index) in visibleRows" :key="index" :sources="row" />
    <button
      v-if="hiddenCount > 0"
      type="button"
      class="more-button"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      {{ expanded ? 'Ver menos' : `Ver mais (${hiddenCount})` }}
    </button>
  </div>
</template>

<style lang="css" scoped>
.source-carousel {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-3);
  align-self: stretch;
  min-width: 0;
}

.more-button {
  cursor: pointer;
  padding: var(--spacing-1) 0;
  background: transparent;
  color: var(--color-primary);
  font-size: var(--font-sm);
  font-weight: 700;
}

.more-button:hover {
  text-decoration: underline;
}

.more-button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
</style>
