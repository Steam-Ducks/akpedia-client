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
import { useProfileRequestsStore } from '@/stores/profile-requests-store'

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

const profileRequests = useProfileRequestsStore()

/** With requests waiting, "Usuários" shows how many and opens on them. */
const adminEntryList = computed<NavEntry[]>(() => {
  const pending = profileRequests.pendingCount
  return [
    pending > 0
      ? {
          to: '/admin/users?tab=requests',
          display: 'Usuários',
          icon: Users,
          badge: pending,
          badgeLabel:
            pending === 1
              ? '1 solicitação de alteração aguardando análise'
              : `${pending} solicitações de alteração aguardando análise`,
        }
      : { to: '/admin/users', display: 'Usuários', icon: Users },
    { to: '/admin/permissions', display: 'Permissões', icon: ShieldCheck },
    { to: '/admin/audit', display: 'Auditoria', icon: History },
    { to: '/admin/terms', display: 'Termos de uso', icon: FileSignature },
  ]
})

// Only admins decide requests, so only they keep the count.
watch(
  () => sessionUser.value?.isAdmin,
  (isAdmin) => (isAdmin ? profileRequests.watchPending() : profileRequests.stopWatching()),
  { immediate: true },
)
onBeforeUnmount(() => profileRequests.stopWatching())
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
