<template>
  <aside class="ak-sidebar">
    <div class="logo-wrapper">
      <RouterLink to="/">
        <img :src="logoUrl" alt="Akpedia" class="logo" />
      </RouterLink>
    </div>
    <AkSidebarNav title="Explorar" :entry-list="explorerMenuEntryList" />
  </aside>
</template>

<script setup lang="ts">
import { NavEntry } from './AkSidebarNav.vue'
import logoUrl from '@/assets/images/akpedia-logo.png'

const explorerMenuEntryList: NavEntry[] = [
  {
    to: '/',
    display: 'Visão geral',
  },
  {
    to: '/docs',
    display: 'Documentos',
    disabled: true,
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
.logo {
  display: block;
  width: 100%;
  max-width: 160px;
  height: auto;
}
</style>
