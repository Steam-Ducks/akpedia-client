<script setup lang="ts">
type Props = {
  selected?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    class="ak-chip"
    :class="{ selected }"
    :aria-pressed="selected"
    @click="emit('click')"
  >
    <slot />
  </button>
</template>

<style lang="css" scoped>
.ak-chip {
  cursor: pointer;
  border: 1px solid rgba(from var(--color-white) r g b / 0.4);
  border-radius: var(--round-lg);
  padding: var(--spacing-1) var(--spacing-3);
  background: transparent;
  color: var(--color-white);
  font-size: var(--font-sm);
  font-weight: 600;
  transition: all 0.2s ease;
}
.ak-chip.selected {
  background: var(--color-white);
  color: var(--color-primary);
  border-color: var(--color-white);
}
</style>
