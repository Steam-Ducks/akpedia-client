<script setup lang="ts">
import HealthStatus from '@/components/HealthStatus.vue'
</script>

<template>
  <main class="app">
    <h1>Akpedia</h1>
    <p>Interface do usuário para cadastro e busca semântica de documentos.</p>
    <HealthStatus />
  </main>
</template>

<style scoped>
.app {
  max-width: 40rem;
  margin: 4rem auto;
  padding: 0 1rem;
  font-family: system-ui, sans-serif;
}
</style>
