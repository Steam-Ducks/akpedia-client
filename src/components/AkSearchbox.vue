<script setup lang="ts">
import { Search } from '@lucide/vue'
import { ArrowUpRight } from '@lucide/vue'
</script>

<template>
  <div class="searchbox-wrapper">
    <div class="searchbox-header">Busca Inteligente</div>
    <div class="searchbox-search-line">
      <AkInput class="flex-1">
        <template #pre>
          <Search />
        </template>
      </AkInput>
      <AkButton>Buscar documentos <ArrowUpRight :size="19" /></AkButton>
    </div>
  </div>
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
