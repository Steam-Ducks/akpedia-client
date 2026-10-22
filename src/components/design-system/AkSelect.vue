<script setup lang="ts">
type Props = {
  required?: boolean
}

defineProps<Props>()

const model = defineModel<string | number | null>({ default: null })
</script>

<template>
  <div class="ak-select">
    <select v-model="model" :required="required">
      <slot />
    </select>
  </div>
</template>

<style lang="css" scoped>
.ak-select {
  background-color: var(--color-input-background);
  display: flex;
  align-items: center;
  padding: var(--spacing-4);
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  color: var(--color-text);
  transition: border-color 0.2s ease;

  select {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    color: inherit;
    font: inherit;
  }
}

.ak-select:focus-within {
  border-color: var(--color-primary);
}
</style>
