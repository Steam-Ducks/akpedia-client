<script setup lang="ts">
import { ArrowUpRight, Search } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { useResultStore } from '@/stores/result-store'

type Props = {
  /** A single slim line, for narrow columns: no header and an icon-only submit button. */
  compact?: boolean
}

defineProps<Props>()

const resultStore = useResultStore()
const { query, status } = storeToRefs(resultStore)

function submit() {
  resultStore.search(query.value)
}
</script>

<template>
  <form class="searchbox-wrapper" :class="{ compact }" @submit.prevent="submit">
    <div v-if="!compact" class="searchbox-header">Busca Inteligente</div>
    <div class="searchbox-search-line">
      <AkInput
        v-model="query"
        class="flex-1"
        type="search"
        :placeholder="compact ? 'Buscar documentos' : 'Busque por uma palavra, frase ou pergunta'"
      >
        <template #pre>
          <Search :size="compact ? 17 : 24" />
        </template>
      </AkInput>
      <AkButton
        type="submit"
        :icon="compact"
        :disabled="status === 'loading' || !query.trim()"
        :title="compact ? 'Buscar documentos' : undefined"
      >
        <template v-if="!compact">Buscar documentos</template>
        <ArrowUpRight :size="19" />
      </AkButton>
    </div>
  </form>
</template>

<style lang="css" scoped>
.flex-1 {
  flex: 1;
}
.searchbox-wrapper {
  position: relative;
  z-index: 0;
  overflow: hidden;
  width: 100%;
  padding: var(--spacing-8);
  background: var(--color-primary);
  color: var(--color-white);

  border-radius: var(--round-lg);

  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}
.searchbox-wrapper::after {
  top: 50%;
  left: 60%;
  position: absolute;
  content: '';
  width: 600px;
  aspect-ratio: 1;
  background-color: rgba(255, 255, 255, 0.06);
  z-index: -1;
  border-radius: 50%;
  pointer-events: none;

  transform: translate(0, -50%);
}
.searchbox-header {
  color: rgba(from var(--color-white) r g b / 0.85);
  text-transform: uppercase;
  font-weight: 600;
}
.searchbox-search-line {
  position: relative;
  width: 100%;
  display: flex;
  gap: var(--spacing-5);
}

.searchbox-wrapper.compact {
  padding: var(--spacing-2);
}
.searchbox-wrapper.compact::after {
  width: 200px;
}
.compact .searchbox-search-line {
  align-items: center;
  gap: var(--spacing-2);
}
.compact :deep(.ak-input) {
  padding: var(--spacing-2) var(--spacing-3);
  gap: var(--spacing-2);
  font-size: var(--font-md);
}
</style>
