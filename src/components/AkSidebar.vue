<template>
  <aside class="ak-sidebar">
    <div class="logo-wrapper">LOGO</div>
    <AkSidebarNav title="Explorar" :entry-list="explorerMenuEntryList" />
  </aside>
</template>

<script setup lang="ts">
import { NavEntry } from './AkSidebarNav.vue'

const explorerMenuEntryList: NavEntry[] = [
  {
    to: '/',
    display: 'Visão geral',
  },
  {
    to: '/docs',
    display: 'Documentos',
  },
]
</script>

<style lang="css" scoped>
.ak-sidebar {
  position: relative;
  min-width: 240px;
  max-height: 100%;
  background-color: var(--color-foreground);
  border-right: 1px solid var(--color-border);
}
.logo-wrapper {
  padding: var(--spacing-8);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--spacing-4);
}
</style>
