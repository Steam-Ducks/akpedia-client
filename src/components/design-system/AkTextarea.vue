<script setup lang="ts">
type Props = {
  placeholder?: string
  rows?: number
}

withDefaults(defineProps<Props>(), { rows: 3 })

const model = defineModel<string>({ default: '' })
</script>

<template>
  <div class="ak-textarea">
    <textarea v-model="model" :placeholder="placeholder" :rows="rows"></textarea>
  </div>
</template>

<style lang="css" scoped>
.ak-textarea {
  background-color: var(--color-input-background);
  display: flex;
  padding: var(--spacing-4);
  border-radius: var(--round-lg);
  color: var(--color-text);

  textarea {
    width: 100%;
    background: transparent;
    border: none;
    color: inherit;
    font: inherit;
    resize: vertical;
  }
}
</style>
