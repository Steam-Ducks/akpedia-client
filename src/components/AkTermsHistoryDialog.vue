<script setup lang="ts">
import { CircleAlert, X } from '@lucide/vue'
import { fetchTermsHistoryEntry } from '@/services/terms'
import type { TermsHistoryDetail, TermsHistoryEntry, TermsHistoryPermission } from '@/types/Terms'
import { formatDateTime } from '@/utils/date'
import { TERMS_HISTORY_ACTION_LABELS } from '@/utils/terms-history'

/**
 * The optional permissions of the version of one history entry: as the user had them right before
 * it, and right after it.
 */
const props = defineProps<{ entry: TermsHistoryEntry }>()
const emit = defineEmits<{ close: [] }>()

const detail = ref<TermsHistoryDetail | null>(null)
const status = ref<'loading' | 'done' | 'error'>('loading')
const error = ref<string | null>(null)
const closeButton = ref<{ $el: HTMLElement } | null>(null)

/** Allowed before this action, not after it: the user took it back. */
const revoked = (p: TermsHistoryPermission) => p.grantedBefore === true && p.grantedAfter === false

const statusLabel = (granted: boolean | null) =>
  granted === null ? '—' : granted ? 'Permitida' : 'Não permitida'

onMounted(async () => {
  closeButton.value?.$el.focus()
  try {
    detail.value = await fetchTermsHistoryEntry(props.entry.action, props.entry.id)
    status.value = 'done'
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Não foi possível carregar as permissões.'
    status.value = 'error'
  }
})
</script>

<template>
  <div class="ak-terms-history-dialog" @click.self="emit('close')">
    <div
      class="history-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-history-title"
      @keydown.esc="emit('close')"
    >
      <div class="dialog-header">
        <div>
          <div id="terms-history-title" class="text-title-small">
            Permissões opcionais · versão {{ entry.version }}
          </div>
          <div class="text-muted">
            {{ entry.userName ?? entry.userEmail ?? 'Usuário desconhecido' }} ·
            {{ TERMS_HISTORY_ACTION_LABELS[entry.action].toLowerCase() }} em
            {{ formatDateTime(entry.at) }}
          </div>
        </div>
        <AkButton
          ref="closeButton"
          type="button"
          class="dialog-close"
          aria-label="Fechar"
          @click="emit('close')"
        >
          <X :size="17" />
        </AkButton>
      </div>

      <div v-if="status === 'loading'" class="text-muted">Carregando as permissões…</div>
      <div v-else-if="status === 'error'" class="dialog-error" role="alert">
        <CircleAlert :size="19" />
        <span>{{ error }}</span>
      </div>
      <div v-else-if="!detail?.permissions.length" class="text-muted dialog-empty">
        Esta versão dos termos não tem permissões opcionais.
      </div>
      <template v-else>
        <div v-if="entry.action === 'declined'" class="text-muted">
          Recusar os termos não muda as permissões: antes e depois são iguais.
        </div>
        <div class="table-wrapper">
          <table class="permissions-table">
            <thead>
              <tr>
                <th scope="col">Permissão</th>
                <th scope="col">Antes</th>
                <th scope="col">Depois</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in detail.permissions" :key="p.id" class="permission-row">
                <td>
                  <div class="text-bold">
                    {{ p.label }}
                    <span v-if="p.changed" class="changed-tag">alterada</span>
                  </div>
                  <div class="text-muted permission-description">{{ p.description }}</div>
                </td>
                <td class="nowrap permission-before">
                  <span :class="['status', { 'status--on': p.grantedBefore }]">
                    {{ statusLabel(p.grantedBefore) }}
                  </span>
                </td>
                <td class="nowrap permission-after">
                  <span
                    :class="[
                      'status',
                      {
                        'status--on': p.grantedAfter,
                        'status--revoked': revoked(p),
                      },
                    ]"
                  >
                    {{ statusLabel(p.grantedAfter) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </div>
</template>

<style lang="css" scoped>
.ak-terms-history-dialog {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-5);
  background-color: rgb(from var(--color-black) r g b / 0.55);
}
.history-dialog {
  width: 100%;
  max-width: 720px;
  max-height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  padding: var(--spacing-8);
  border-radius: var(--round-lg);
  background-color: var(--color-foreground);
  box-shadow: var(--elevation-2);
}
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-4);
}
.dialog-error {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-4);
  border-radius: var(--round-lg);
  color: var(--color-wine);
  background-color: var(--color-wine-lighest);
}
.table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
}
.permissions-table {
  width: 100%;
  border-collapse: collapse;
}
.permissions-table th,
.permissions-table td {
  padding: var(--spacing-3) var(--spacing-4);
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--color-border);
}
.permissions-table tbody tr:last-child td {
  border-bottom: none;
}
.permission-description {
  font-size: var(--font-sm);
}
.changed-tag {
  margin-left: var(--spacing-2);
  font-size: var(--font-sm);
  font-weight: 400;
  color: var(--color-primary);
}
.status {
  color: var(--color-text-muted);
}
.status--revoked {
  color: var(--color-wine);
  font-weight: 600;
}
.status--on {
  color: var(--color-text);
  font-weight: 600;
}
.nowrap {
  white-space: nowrap;
}
</style>
