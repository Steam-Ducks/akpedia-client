<script setup lang="ts">
import type { Component } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

export type NavEntry = {
  to: string
  display: string
  icon: Component
  disabled?: boolean
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
      <component
        :is="disabled ? 'span' : RouterLink"
        :to="disabled ? undefined : to"
        class="sidebar-nav-item text-button"
        :class="{
          'sidebar-nav-item--active': !disabled && isActive(to),
          'sidebar-nav-item--disabled': disabled,
        }"
        :aria-disabled="disabled || undefined"
        v-for="{ to, display, icon, disabled } in entryList"
        :key="to"
      >
        <component :is="icon" :size="18" aria-hidden="true" />
        {{ display }}
      </component>
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
  gap: var(--spacing-2);
  z-index: 0;

  text-decoration: none;
  cursor: pointer;

  transition: all 200ms ease;
}

.sidebar-nav-item--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sidebar-nav-item:hover:not(.sidebar-nav-item--active, .sidebar-nav-item--disabled) {
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
