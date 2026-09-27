<script setup lang="ts">
import { ArrowUpRight, Search } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { useResultStore } from '@/stores/result-store'

const resultStore = useResultStore()
const { status } = storeToRefs(resultStore)

const query = ref('')

function submit() {
  resultStore.search(query.value)
}
</script>

<template>
  <form class="searchbox-wrapper" @submit.prevent="submit">
    <div class="searchbox-header">Busca Inteligente</div>
    <div class="searchbox-search-line">
      <AkInput
        v-model="query"
        class="flex-1"
        type="search"
        placeholder="Busque por uma palavra, frase ou pergunta"
      >
        <template #pre>
          <Search />
        </template>
      </AkInput>
      <AkButton type="submit" :disabled="status === 'loading' || !query.trim()">
        Buscar documentos <ArrowUpRight :size="19" />
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
</style>
