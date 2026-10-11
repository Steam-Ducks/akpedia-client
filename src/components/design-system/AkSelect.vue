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
  border-radius: var(--round-lg);
  color: var(--color-text);

  select {
    width: 100%;
    background: transparent;
    border: none;
    color: inherit;
    font: inherit;
  }
}
</style>
