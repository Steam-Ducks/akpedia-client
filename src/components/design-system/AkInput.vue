<script setup lang="ts">
type Props = {
  type?: string
  placeholder?: string
}

defineProps<Props>()

const model = defineModel<string>({ default: '' })
</script>

<template>
  <div class="ak-input">
    <slot name="pre" />
    <input v-model="model" :type="type" :placeholder="placeholder" />
  </div>
</template>

<style lang="css" scoped>
.ak-input {
  background-color: var(--color-input-background);
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  border-radius: var(--round-lg);
  color: var(--color-text);

  input {
    width: 100%;
  }
}
</style>
