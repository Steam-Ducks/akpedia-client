<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useResultStore } from '@/stores/result-store'

const userName = 'Camila'
const empresaName = 'Akaer'

const resultStore = useResultStore()
const { results, recent, status, error } = storeToRefs(resultStore)

onMounted(() => resultStore.loadRecent())
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
    <div class="result-section">
      <div class="result-list">
        <template v-if="status === 'idle' && recent.length > 0">
          <div class="text-muted">Documentos recentes</div>
          <AkResultCard v-for="item in recent" :key="item.documentData.id" :payload="item" />
        </template>
        <div v-else-if="status === 'loading'" class="text-muted">Buscando documentos…</div>
        <div v-else-if="status === 'error'" class="text-muted">{{ error }}</div>
        <div v-else-if="status === 'done' && results.length === 0" class="text-muted">
          Nenhum documento encontrado para essa busca.
        </div>
        <template v-else-if="status === 'done'">
          <div class="text-muted">
            {{ results.length }}
            {{ results.length === 1 ? 'documento encontrado' : 'documentos encontrados' }}
          </div>
          <AkResultCard v-for="item in results" :key="item.documentData.id" :payload="item" />
        </template>
      </div>
    </div>
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
.result-section {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-4);
}

.result-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}
</style>
