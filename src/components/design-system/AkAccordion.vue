<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'

type Props = {
  title: string
}

defineProps<Props>()

const open = ref(false)
</script>

<template>
  <div class="ak-accordion" :class="{ open }">
    <button type="button" class="ak-accordion-header" :aria-expanded="open" @click="open = !open">
      <span>{{ title }}</span>
      <ChevronDown :size="16" class="ak-accordion-chevron" />
    </button>
    <div v-if="open" class="ak-accordion-content">
      <slot />
    </div>
  </div>
</template>

<style lang="css" scoped>
.ak-accordion-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
  cursor: pointer;
  background: transparent;
  color: inherit;
  font-size: var(--font-sm);
  font-weight: 600;
}
.ak-accordion-chevron {
  transition: transform 0.2s ease;
}
.ak-accordion.open .ak-accordion-chevron {
  transform: rotate(180deg);
}
.ak-accordion-content {
  padding-top: var(--spacing-2);
}
</style>
