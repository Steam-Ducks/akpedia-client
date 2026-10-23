<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { usePendingStore } from '@/stores/pending-store'
import { formatRelativeDays } from '@/utils/date'

const router = useRouter()
const pendingStore = usePendingStore()
const { pendingDocuments, status, error } = storeToRefs(pendingStore)

const confidencePercent = (confidence: number | null) =>
  confidence === null ? null : Math.round(confidence * 100)

const openDocument = (documentId: number) => {
  router.push(`/docs/${documentId}`)
}

onMounted(() => {
  pendingStore.load()
})
</script>

<template>
  <main class="ak-pending">
    <div class="pending-header">
      <div class="text-title-large">Pendentes</div>
      <div class="text-muted">
        Documentos aguardando aprovação, do envio mais antigo para o mais recente.
      </div>
    </div>

    <div v-if="status === 'loading'" class="text-muted">Carregando documentos pendentes…</div>
    <div v-else-if="status === 'error'" class="text-muted">{{ error }}</div>
    <div v-else-if="status === 'done' && pendingDocuments.length === 0" class="text-muted">
      Não há documentos pendentes de revisão.
    </div>
    <div v-else-if="status === 'done'" class="pending-list">
      <div
        v-for="document in pendingDocuments"
        :key="document.id"
        class="pending-card"
        @click="openDocument(document.id)"
      >
        <div class="pending-main">
          <div class="pending-infos">
            <div class="text-title-small">{{ document.name }}</div>
            <div class="text-muted">
              {{ document.creatorName }} · {{ document.sectorName }} · aguardando
              {{ formatRelativeDays(document.submittedAt) }}
            </div>
          </div>
          <div
            v-if="document.suggestedCategory"
            class="suggestion-badge"
            :class="{ 'suggestion-badge--low': document.lowConfidence }"
          >
            <TriangleAlert v-if="document.lowConfidence" :size="14" />
            {{ document.suggestedCategory }}
            <template v-if="confidencePercent(document.confidence) !== null">
              · {{ confidencePercent(document.confidence) }}%
            </template>
          </div>
          <div v-else class="text-muted">Sem sugestão de categoria</div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.ak-pending {
  padding: var(--spacing-10);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.pending-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.pending-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.pending-card {
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  padding: var(--spacing-4);
  box-shadow: var(--elevation-1);
  background-color: var(--color-white);
  cursor: pointer;

  transition: all 0.2s ease;
}

.pending-card:hover {
  border-color: var(--color-primary-muted);
  box-shadow: var(--elevation-2);
}

.pending-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
}

.pending-infos {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  min-width: 0;
}

.suggestion-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  flex-shrink: 0;
  font-size: var(--font-sm);
  font-weight: 700;
  color: var(--color-primary);
  background-color: var(--color-primary-selected);
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--round-lg);
  white-space: nowrap;
}

.suggestion-badge--low {
  color: var(--color-white);
  background-color: var(--color-text);
}
</style>
