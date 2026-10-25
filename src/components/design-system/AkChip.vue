<script setup lang="ts">
type Props = {
  selected?: boolean
  /** `dark`: outlined white, filled white when selected, for a colored backdrop. `light`: outlined primary, filled primary when selected, for a plain background. */
  theme?: 'dark' | 'light'
}

withDefaults(defineProps<Props>(), { theme: 'dark' })

const emit = defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    class="ak-chip"
    :class="[theme, { selected }]"
    :aria-pressed="selected"
    @click="emit('click')"
  >
    <slot />
  </button>
</template>

<style lang="css" scoped>
.ak-chip {
  cursor: pointer;
  border-radius: var(--round-lg);
  padding: var(--spacing-1) var(--spacing-3);
  background: transparent;
  font-size: var(--font-sm);
  font-weight: 600;
  transition: all 0.2s ease;
}

.ak-chip.dark {
  border: 1px solid rgba(from var(--color-white) r g b / 0.4);
  color: var(--color-white);
}
.ak-chip.dark.selected {
  background: var(--color-white);
  color: var(--color-primary);
  border-color: var(--color-white);
}

.ak-chip.light {
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
}
.ak-chip.light.selected {
  background: var(--color-primary);
  color: var(--color-white);
  border-color: var(--color-primary);
}
</style>
