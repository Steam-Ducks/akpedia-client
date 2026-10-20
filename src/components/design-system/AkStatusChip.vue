<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, CheckCircle2, Clock, Loader2, XCircle } from '@lucide/vue'
import type { SubmissionStatus } from '@/types/Submission'

type Props = {
  status: SubmissionStatus
}

const props = defineProps<Props>()

const presentationByStatus: Record<
  SubmissionStatus,
  { label: string; icon: unknown; tone: 'muted' | 'primary' | 'alert' }
> = {
  UNDER_REVIEW: { label: 'Em análise', icon: Clock, tone: 'muted' },
  PROCESSING: { label: 'Processando', icon: Loader2, tone: 'muted' },
  PUBLISHED: { label: 'Publicado', icon: CheckCircle2, tone: 'primary' },
  INDEXING_FAILED: { label: 'Falha na indexação', icon: AlertTriangle, tone: 'alert' },
  RETURNED: { label: 'Devolvido', icon: XCircle, tone: 'alert' },
}

const presentation = computed(() => presentationByStatus[props.status])
</script>

<template>
  <span class="ak-status-chip" :class="presentation.tone">
    <component :is="presentation.icon" :size="14" :class="{ spin: status === 'PROCESSING' }" />
    {{ presentation.label }}
  </span>
</template>

<style lang="css" scoped>
.ak-status-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--font-sm);
  font-weight: 700;
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--round-lg);
  white-space: nowrap;
}

.ak-status-chip.muted {
  color: var(--color-text-muted);
  background-color: var(--color-background-hover);
}

.ak-status-chip.primary {
  color: var(--color-primary);
  background-color: var(--color-primary-selected);
}

.ak-status-chip.alert {
  color: var(--color-white);
  background-color: var(--color-text);
}

.spin {
  animation: ak-status-chip-spin 1.2s linear infinite;
}

@keyframes ak-status-chip-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
