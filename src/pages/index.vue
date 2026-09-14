<script setup lang="ts">
const userName = 'Camila'
const empresaName = 'Akaer'
</script>

<template>
  <main class="ak-general">
    <div class="salutation-wrapper">
      <div class="salutation-date">Terça-feira, 08 de setembro</div>
      <div class="salutation-welcome text-title-large">
        Olá, {{ userName }}. <span class="text-highlight">O que você procura?</span>
      </div>
      <div class="salutation-description">
        Encontre documentos técnicos, normativas e informações de {{ empresaName }} em um só lugar.
      </div>
    </div>
    <AkSearchbox />
  </main>
</template>

<style scoped>
.ak-general {
  padding: var(--spacing-10);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.salutation-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.salutation-date {
  color: var(--color-text-muted);
  text-transform: uppercase;
  font-size: var(--font-md);
  font-weight: 600;
}
.salutation-description {
  color: var(--color-text-muted);
}
</style>
