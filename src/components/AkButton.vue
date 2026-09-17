<script lang="ts" setup>
type Props = {
  icon?: boolean
  color?: 'default' | 'primary'
}

defineProps<Props>()
</script>

<template>
  <button class="ak-button" :class="{ icon: icon, primary: color === 'primary' }">
    <slot />
  </button>
</template>

<style lang="css" scoped>
.ak-button {
  background-color: var(--color-black);
  padding: var(--spacing-3) var(--spacing-5);
  border-radius: var(--round-lg);
  font-weight: 800;
  transition: all 0.2s ease;

  color: var(--color-white);

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
}

.ak-button.icon {
  width: var(--spacing-3);
  aspect-ratio: 1;
}

.ak-button.icon * {
  position: absolute;
}

.ak-button:hover {
  background-color: rgba(from var(--color-black) r g b / 0.7);
}
.ak-button.primary {
  background-color: var(--color-primary);
}

.ak-button.primary:hover {
  background-color: rgba(from var(--color-primary) r g b / 0.85);
}
</style>
