<script setup lang="ts">
import { useRoute } from 'vue-router'

export type NavEntry = {
  to: string
  display: string
}
type Props = {
  title: string
  entryList: NavEntry[]
}

defineProps<Props>()

const route = useRoute()

function isActive(to: string) {
  return route.path === to
}
</script>

<template>
  <div class="sidebar-nav">
    <span class="sidebar-nav-title text-label-small">{{ title }}</span>
    <nav class="sidebar-nav-content">
      <RouterLink
        :to="to"
        class="sidebar-nav-item text-button"
        :class="{ 'sidebar-nav-item--active': isActive(to) }"
        v-for="{ to, display } in entryList"
        :key="to"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-layout-dashboard-icon lucide-layout-dashboard"
          aria-hidden="true"
        >
          <rect width="7" height="9" x="3" y="3" rx="1"></rect>
          <rect width="7" height="5" x="14" y="3" rx="1"></rect>
          <rect width="7" height="9" x="14" y="12" rx="1"></rect>
          <rect width="7" height="5" x="3" y="16" rx="1"></rect>
        </svg>
        {{ display }}
      </RouterLink>
    </nav>
  </div>
</template>

<style lang="css" scoped>
.sidebar-nav {
  padding: 0 var(--spacing-3);
}
.sidebar-nav-title {
  display: inline-block;
  color: var(--color-text-muted);
  text-transform: uppercase;
  margin-bottom: var(--spacing-2);
}
.sidebar-nav-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.sidebar-nav-item {
  position: relative;
  padding: var(--spacing-3);
  color: var(--color-text-muted);
  border-radius: var(--round-lg);

  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  z-index: 0;

  text-decoration: none;
  cursor: pointer;

  transition: all 200ms ease;
}

.sidebar-nav-item:hover:not(.sidebar-nav-item--active) {
  color: var(--color-text);
  background-color: var(--color-background-hover);
}

.sidebar-nav-item--active {
  color: var(--color-primary);
}

.sidebar-nav-item--active::before,
.sidebar-nav-item--active::after {
  content: '';
  position: absolute;
  top: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
}

.sidebar-nav-item--active::before {
  left: calc(var(--spacing-1) * -1);
  background-color: var(--color-primary);
  z-index: -2;
}

.sidebar-nav-item--active::after {
  left: 0;
  background-color: var(--color-primary-selected);
  z-index: -1;
}
</style>
