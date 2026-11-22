<script lang="ts" setup>
import { LogOut, UserRound } from '@lucide/vue'
import { RouterLink, useRoute } from 'vue-router'
import { logout, sessionUser } from '@/services/auth'

const open = ref(false)
const route = useRoute()

// Close the menu once one of its links was followed.
watch(
  () => route.path,
  () => (open.value = false),
)

/** First letters of the first and last names, e.g. "Ana Maria Souza" -> "AS". */
const initials = computed(() => {
  const words = (sessionUser.value?.name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return words[0][0] + last
})

function closeOnOutsideClick(event: MouseEvent) {
  if (!(event.target as Element).closest('.user-menu')) open.value = false
}

onMounted(() => document.addEventListener('click', closeOnOutsideClick))
onBeforeUnmount(() => document.removeEventListener('click', closeOnOutsideClick))
</script>

<template>
  <header class="ak-header">
    <nav class="user-menu">
      <button
        type="button"
        class="user-icon"
        :title="sessionUser?.name"
        :aria-expanded="open"
        aria-haspopup="menu"
        @click="open = !open"
      >
        {{ initials }}
      </button>
      <div v-if="open" class="user-popover" role="menu">
        <div class="user-info">
          <span class="text-bold">{{ sessionUser?.name }}</span>
          <span class="text-muted">{{ sessionUser?.email }}</span>
          <span v-if="sessionUser?.sector" class="text-muted">{{ sessionUser.sector }}</span>
        </div>
        <RouterLink to="/conta" class="menu-item text-button" role="menuitem">
          <UserRound :size="16" aria-hidden="true" />
          Minha conta
        </RouterLink>
        <button type="button" class="menu-item text-button" role="menuitem" @click="logout()">
          <LogOut :size="16" aria-hidden="true" />
          Sair
        </button>
      </div>
    </nav>
  </header>
</template>

<style lang="css" scoped>
.ak-header {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  border-bottom: 1px solid var(--color-border);
  padding: var(--spacing-5) var(--spacing-8);
}
.user-menu {
  position: relative;
}
.user-icon {
  width: var(--spacing-9);
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--round-lg);
  cursor: pointer;

  font-weight: 600;
  text-transform: uppercase;
  text-box: trim-both cap alphabetic;

  background: var(--color-button);
  color: var(--color-text-button);
}
.user-popover {
  position: absolute;
  top: calc(100% + var(--spacing-2));
  right: 0;
  z-index: 10;
  width: max-content;
  min-width: 220px;
  max-width: 320px;
  padding: var(--spacing-2);
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  background-color: var(--color-foreground);
  box-shadow: var(--elevation-2);
}
.user-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  padding: var(--spacing-3);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--spacing-2);
  overflow-wrap: anywhere;
}
.menu-item {
  width: 100%;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3);
  border-radius: var(--round-lg);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 200ms ease;
}
.menu-item:hover {
  color: var(--color-text);
  background-color: var(--color-background-hover);
}
</style>
