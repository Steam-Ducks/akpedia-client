<template>
  <aside class="ak-sidebar">
    <div class="logo-wrapper">
      <RouterLink to="/">
        <img :src="logoUrl" alt="Akpedia" class="logo" />
      </RouterLink>
    </div>
    <AkSidebarNav title="Explorar" :entry-list="entryList" />
  </aside>
</template>

<script setup lang="ts">
import { NavEntry } from './AkSidebarNav.vue'
import logoUrl from '@/assets/images/akpedia-logo.png'
import { sessionUser } from '@/services/auth'

const explorerMenuEntryList: NavEntry[] = [
  {
    to: '/',
    display: 'Visão geral',
  },
  {
    to: '/docs',
    display: 'Documentos',
  },
  {
    to: '/upload',
    display: 'Enviar documento',
  },
]

const reviewEntry: NavEntry = { to: '/review', display: 'Pendentes' }

/** "Pendentes" only for those who may review. */
const entryList = computed(() =>
  sessionUser.value?.canReview ? [...explorerMenuEntryList, reviewEntry] : explorerMenuEntryList,
)
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
