<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'

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
    <ChevronDown class="ak-select-icon" :size="19" aria-hidden="true" />
  </div>
</template>

<style lang="css" scoped>
.ak-select {
  position: relative;
  background-color: var(--color-input-background);
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  color: var(--color-text);
  transition: border-color 0.2s ease;

  /* Without `appearance: none` the browser draws its own box and arrow inside the field. The
     padding sits on the select, not the wrapper, so a click anywhere in the field opens it. */
  select {
    appearance: none;
    width: 100%;
    padding: var(--spacing-4);
    padding-right: calc(var(--spacing-4) * 2 + 19px);
    background: transparent;
    border: none;
    border-radius: inherit;
    outline: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
}

/* The options' list, where the browser lets it be styled (customizable select, Chrome 135+);
   elsewhere it stays the browser's own list. The options come from the slot, hence :slotted. */
@supports (appearance: base-select) {
  .ak-select select,
  .ak-select select::picker(select) {
    appearance: base-select;
  }

  .ak-select select::picker-icon {
    display: none;
  }

  .ak-select select::picker(select) {
    margin-top: var(--spacing-1);
    padding: var(--spacing-1);
    border: 1px solid var(--color-border);
    border-radius: var(--round-lg);
    background-color: var(--color-input-background);
    color: var(--color-text);
    box-shadow: 0 4px 12px 0 rgb(from var(--color-black) r g b / 0.14);
  }

  .ak-select :slotted(option) {
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: var(--round-md);
    cursor: pointer;
  }

  .ak-select :slotted(option:hover),
  .ak-select :slotted(option:focus-visible) {
    outline: none;
    background-color: var(--color-background-hover);
  }

  .ak-select :slotted(option:checked) {
    color: var(--color-primary);
    background-color: var(--color-primary-selected);
    font-weight: 600;
  }

  .ak-select :slotted(option:disabled) {
    cursor: default;
    opacity: 0.5;
  }

  .ak-select :slotted(option)::checkmark {
    display: none;
  }
}

.ak-select-icon {
  position: absolute;
  right: var(--spacing-4);
  color: var(--color-text-muted);
  pointer-events: none;
}

.ak-select:focus-within {
  border-color: var(--color-primary);
}
</style>
