<script setup lang="ts">
import { ShieldAlert } from '@lucide/vue'

const route = useRoute()

/** The address the user tried to open, when the guard sent them here. */
const attempted = computed(() => {
  const from = route.query.from
  return typeof from === 'string' && from.startsWith('/') ? from : null
})
</script>

<template>
  <main class="ak-no-permission">
    <ShieldAlert :size="48" class="no-permission-icon" aria-hidden="true" />
    <div class="text-title-large">Sem permissão</div>
    <div class="text-muted">
      Você não tem permissão para abrir
      <code v-if="attempted" class="attempted-path">{{ attempted }}</code>
      <span v-else>esta página</span>. Se precisar dela, peça a um administrador o papel adequado.
    </div>
    <RouterLink to="/" class="back-home">
      <AkButton type="button" color="primary">Voltar para a visão geral</AkButton>
    </RouterLink>
  </main>
</template>

<style lang="css" scoped>
.ak-no-permission {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-4);
  padding: var(--spacing-10);
  text-align: center;
}
.no-permission-icon {
  color: var(--color-primary);
}
.attempted-path {
  font-family: monospace;
}
.back-home {
  text-decoration: none;
}
</style>
