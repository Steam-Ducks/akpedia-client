<script lang="ts" setup></script>

<template>
  <header class="ak-header">
    <nav>
      <div class="user-icon">us</div>
    </nav>
  </header>
</template>

<style lang="css" scoped>
.ak-header {
  width: 100%;
  display: flex;
  justify-content: flex-end;
  border-bottom: 1px solid var(--color-border);
  padding: var(--spacing-5) var(--spacing-8);
}
.user-icon {
  width: var(--spacing-9);
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--round-lg);

  font-weight: 600;
  text-transform: uppercase;
  text-box: trim-both cap alphabetic;

  background: var(--color-button);
  color: var(--color-text-button);
}
</style>
