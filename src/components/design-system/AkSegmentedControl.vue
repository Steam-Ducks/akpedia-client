<script setup lang="ts" generic="T extends string">
type Option = { value: T; label: string }

type Props = {
  options: Option[]
  label: string
  theme?: 'dark' | 'light'
}

const props = withDefaults(defineProps<Props>(), { theme: 'light' })

const model = defineModel<T>({ required: true })

const buttons = ref<HTMLButtonElement[]>([])

const select = (index: number) => {
  const count = props.options.length
  const next = (index + count) % count
  model.value = props.options[next].value
  buttons.value[next]?.focus()
}

const onKeydown = (event: KeyboardEvent, index: number) => {
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    event.preventDefault()
    select(index + 1)
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault()
    select(index - 1)
  }
}
</script>

<template>
  <div class="ak-segmented" :class="theme" role="radiogroup" :aria-label="label">
    <button
      v-for="(option, index) in options"
      :key="option.value"
      ref="buttons"
      type="button"
      role="radio"
      class="ak-segmented-option"
      :class="{ selected: model === option.value }"
      :aria-checked="model === option.value"
      :tabindex="model === option.value ? 0 : -1"
      @click="model = option.value"
      @keydown="onKeydown($event, index)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<style lang="css" scoped>
.ak-segmented {
  display: inline-flex;
  align-self: flex-start;
  padding: var(--spacing-1);
  gap: var(--spacing-1);
  background-color: var(--color-input-background);
  border: 1px solid var(--color-border);
  border-radius: var(--round-pill);
}

.ak-segmented-option {
  cursor: pointer;
  padding: var(--spacing-1) var(--spacing-4);
  border-radius: var(--round-pill);
  background: transparent;
  color: var(--color-text-muted);
  font-size: var(--font-sm);
  font-weight: 700;
  transition: all 0.2s ease;
}

.ak-segmented-option.selected {
  background-color: var(--color-primary);
  color: var(--color-white);
}

.ak-segmented-option:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
.ak-segmented.dark {
  background-color: rgba(from var(--color-white) r g b / 0.12);
  border-color: rgba(from var(--color-white) r g b / 0.3);
}

.ak-segmented.dark .ak-segmented-option {
  color: rgba(from var(--color-white) r g b / 0.85);
}

.ak-segmented.dark .ak-segmented-option.selected {
  background-color: var(--color-white);
  color: var(--color-primary);
}

.ak-segmented.dark .ak-segmented-option:focus-visible {
  outline-color: var(--color-white);
}
</style>
