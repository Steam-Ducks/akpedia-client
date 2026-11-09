<template>
  <aside class="ak-sidebar">
    <div class="logo-wrapper">
      <RouterLink to="/">
        <img :src="logoUrl" alt="Akpedia" class="logo" />
      </RouterLink>
    </div>
    <AkSidebarNav title="Explorar" :entry-list="entryList" />
    <AkSidebarNav
      v-if="sessionUser?.isAdmin"
      class="sidebar-section"
      title="Administração"
      :entry-list="adminEntryList"
    />
  </aside>
</template>

<script setup lang="ts">
import {
  ClipboardCheck,
  FileSignature,
  FileText,
  History,
  LayoutDashboard,
  ShieldCheck,
  Upload,
  Users,
} from '@lucide/vue'
import { NavEntry } from './AkSidebarNav.vue'
import logoUrl from '@/assets/images/akpedia-logo.png'
import { sessionUser } from '@/services/auth'

const explorerMenuEntryList: NavEntry[] = [
  {
    to: '/',
    display: 'Visão geral',
    icon: LayoutDashboard,
  },
  {
    to: '/docs',
    display: 'Documentos',
    icon: FileText,
  },
  {
    to: '/upload',
    display: 'Enviar documento',
    icon: Upload,
  },
]

const reviewEntry: NavEntry = { to: '/review', display: 'Pendentes', icon: ClipboardCheck }

/** "Pendentes" only for those who may review. */
const entryList = computed(() =>
  sessionUser.value?.canReview ? [...explorerMenuEntryList, reviewEntry] : explorerMenuEntryList,
)

const adminEntryList: NavEntry[] = [
  { to: '/admin/users', display: 'Usuários', icon: Users },
  { to: '/admin/permissions', display: 'Permissões', icon: ShieldCheck },
  { to: '/admin/audit', display: 'Auditoria', icon: History },
  { to: '/admin/terms', display: 'Termos de uso', icon: FileSignature },
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
.sidebar-section {
  margin-top: var(--spacing-6);
}
.logo {
  display: block;
  width: 100%;
  max-width: 160px;
  height: auto;
}
</style>
