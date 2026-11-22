<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import { fetchBreachNotice, fetchBreachNotices } from '@/services/breach-notices'
import type { BreachNoticeDetail, BreachNoticeSummary } from '@/types/BreachNotice'

const status = ref<'loading' | 'done' | 'error'>('loading')
const error = ref<string | null>(null)
const notices = ref<BreachNoticeSummary[]>([])
const page = ref(0)
const totalPages = ref(0)

const openId = ref<number | null>(null)
const detail = ref<BreachNoticeDetail | null>(null)
const detailError = ref<string | null>(null)

/** After each page loads (or fails to), once it is on screen: the page sizes its form from it. */
const emit = defineEmits<{ loaded: [] }>()

const formatDate = (date: Date) =>
  date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

const load = async (target = page.value) => {
  status.value = 'loading'
  error.value = null
  try {
    const result = await fetchBreachNotices(target)
    notices.value = result.content
    page.value = result.page
    totalPages.value = result.totalPages
    status.value = 'done'
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Não foi possível carregar os avisos enviados.'
    status.value = 'error'
  }
  await nextTick()
  emit('loaded')
}

const toggle = async (id: number) => {
  if (openId.value === id) {
    openId.value = null
    return
  }
  openId.value = id
  detail.value = null
  detailError.value = null
  try {
    const loaded = await fetchBreachNotice(id)
    if (openId.value === id) detail.value = loaded
  } catch (e) {
    if (openId.value !== id) return
    detailError.value = e instanceof Error ? e.message : 'Não foi possível carregar o aviso.'
  }
}

const reload = () => load(0)

defineExpose({ reload })

onMounted(() => load(0))
</script>

<template>
  <section class="ak-breach-notice-history">
    <div class="text-title-small">Avisos enviados</div>

    <div v-if="status === 'loading' && notices.length === 0" class="text-muted">
      Carregando os avisos…
    </div>
    <div v-else-if="status === 'error'" class="history-feedback">
      <CircleAlert :size="19" />
      <span>{{ error }}</span>
    </div>
    <div v-else-if="notices.length === 0" class="text-muted history-empty">
      Nenhum aviso foi enviado ainda.
    </div>

    <ul v-else class="history-list">
      <li v-for="notice in notices" :key="notice.id" class="history-item">
        <button
          type="button"
          class="history-row"
          :aria-expanded="openId === notice.id"
          @click="toggle(notice.id)"
        >
          <span class="history-subject">{{ notice.subject }}</span>
          <span class="text-muted history-date">{{ formatDate(notice.sentAt) }}</span>
          <span class="text-muted">Enviado por {{ notice.sentByName }}</span>
          <span class="text-muted history-counts">
            {{ notice.total }} destinatários · {{ notice.sent }} enviados ·
            {{ notice.failed }} falharam
          </span>
        </button>

        <div v-if="openId === notice.id" class="history-detail">
          <div v-if="detailError" class="history-feedback">
            <CircleAlert :size="19" />
            <span>{{ detailError }}</span>
          </div>
          <div v-else-if="!detail" class="text-muted">Carregando o aviso…</div>
          <template v-else>
            <div class="detail-subject">{{ detail.subject }}</div>
            <div class="detail-body">{{ detail.body }}</div>
            <ul class="recipients">
              <li v-for="recipient in detail.recipients" :key="recipient.email" class="recipient">
                <span class="recipient-name">{{ recipient.name }}</span>
                <span class="text-muted">{{ recipient.email }}</span>
                <AkStatusChip :status="recipient.status" />
                <span v-if="recipient.error" class="recipient-error">{{ recipient.error }}</span>
              </li>
            </ul>
          </template>
        </div>
      </li>
    </ul>

    <AkPaginator
      v-if="status !== 'error' && totalPages > 1"
      :page="page"
      :total-pages="totalPages"
      @change="load"
    />
  </section>
</template>

<style scoped>
.ak-breach-notice-history {
  max-width: 56rem;
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  background-color: var(--color-white);
  padding: var(--spacing-8);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}
.history-list,
.recipients {
  list-style: none;
  margin: 0;
  padding: 0;
}
.history-item {
  border-bottom: 1px solid var(--color-border);
}
.history-item:last-child {
  border-bottom: 0;
}
.history-row {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--spacing-1) var(--spacing-4);
  padding: var(--spacing-3) 0;
  text-align: left;
  cursor: pointer;
}
.history-subject {
  font-weight: 600;
  flex: 1 1 100%;
}
.history-detail {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  margin-bottom: var(--spacing-3);
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  background-color: var(--color-foreground);
}
.detail-subject {
  font-weight: 700;
}
.detail-body {
  white-space: pre-line;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.recipient {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-1) var(--spacing-3);
  padding: var(--spacing-2) 0;
}
.recipient-name {
  font-weight: 600;
}
.recipient-error {
  flex: 1 1 100%;
  color: var(--color-wine);
}
.history-feedback {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-4);
  border-radius: var(--round-lg);
  color: var(--color-wine);
  background-color: var(--color-wine-lighest);
}
</style>
