<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import {
  auditActionLabel,
  auditEntityLabel,
  fetchAuditActions,
  fetchAuditLog,
  HTTP_REQUEST_ACTION,
} from '@/services/audit'
import type { AuditEntry, AuditKind } from '@/types/Audit'
import { formatDateTime } from '@/utils/date'

definePage({ meta: { roles: ['ADMIN'] } })

const PAGE_SIZE = 50
const FILTER_DELAY_MS = 300

const kind = ref<AuditKind>('EVENT')
const action = ref<string>('')
const user = ref('')
/** `YYYY-MM-DD`, as the date inputs give them; empty when not set. */
const from = ref('')
const to = ref('')

const actions = ref<string[]>([])

const entries = ref<AuditEntry[]>([])
const page = ref(0)
const totalPages = ref(0)
const status = ref<'loading' | 'done' | 'error'>('loading')
const loadError = ref<string | null>(null)

/** Plain requests have no event name, so the action filter applies to events only. */
const actionFilterEnabled = computed(() => kind.value !== 'REQUEST')

/** Start of the day, local time. */
const startOfDay = (value: string): Date | null => {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Last millisecond of the day, local time, so "até 07/11" includes all of the 7th. */
const endOfDay = (value: string): Date | null => {
  const start = startOfDay(value)
  return start && new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)
}

/** Guards against an older, slower request overwriting the result of a newer one. */
let latestRequest = 0

const load = async () => {
  const request = ++latestRequest
  status.value = 'loading'
  loadError.value = null
  try {
    const result = await fetchAuditLog({
      kind: kind.value,
      action: actionFilterEnabled.value ? action.value || undefined : undefined,
      user: user.value,
      from: startOfDay(from.value),
      to: endOfDay(to.value),
      page: page.value,
      size: PAGE_SIZE,
    })
    if (request !== latestRequest) return
    entries.value = result.content
    totalPages.value = result.totalPages
    status.value = 'done'
  } catch (e) {
    if (request !== latestRequest) return
    loadError.value = e instanceof Error ? e.message : 'Não foi possível carregar a auditoria.'
    status.value = 'error'
  }
}

const loadActions = async () => {
  try {
    actions.value = await fetchAuditActions()
  } catch {
    // The filter just offers no actions; the log itself still loads.
    actions.value = []
  }
}

const changePage = (next: number) => {
  page.value = next
  load()
}

const clearFilters = () => {
  kind.value = 'EVENT'
  action.value = ''
  user.value = ''
  from.value = ''
  to.value = ''
}

watch(kind, (value) => {
  if (value === 'REQUEST') action.value = ''
})

// Any filter change goes back to the first page; typing waits for a pause.
let filterTimer: ReturnType<typeof setTimeout> | undefined
watch([kind, action, user, from, to], () => {
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => {
    page.value = 0
    load()
  }, FILTER_DELAY_MS)
})

const isRequest = (entry: AuditEntry) => entry.action === HTTP_REQUEST_ACTION

const target = (entry: AuditEntry): string | null => {
  if (!entry.entityType) return null
  const label = auditEntityLabel(entry.entityType)
  if (entry.entityId !== null) return `${label} #${entry.entityId}`
  const email = entry.details?.target_email
  return typeof email === 'string' ? `${label} ${email}` : label
}

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '—'
  if (Array.isArray(value)) return value.length ? value.map(formatValue).join(', ') : '(nenhum)'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/** One line, `key: value · key: value`, for the collapsed cell. */
const detailsSummary = (details: Record<string, unknown>): string =>
  Object.entries(details)
    .map(([key, value]) => `${key}: ${formatValue(value)}`)
    .join(' · ')

const hasDetails = (entry: AuditEntry) =>
  entry.details !== null && Object.keys(entry.details).length > 0

onMounted(() => {
  loadActions()
  load()
})

onBeforeUnmount(() => clearTimeout(filterTimer))
</script>

<template>
  <main class="ak-admin-audit">
    <div class="admin-header">
      <div class="text-title-large">Auditoria</div>
      <div class="text-muted">
        O que cada usuário fez no Akpedia: as ações registradas (termos aceitos, documentos
        aprovados, papéis alterados…) e todas as requisições à API, do mais recente para o mais
        antigo.
      </div>
    </div>

    <form class="audit-filters" @submit.prevent>
      <label class="form-field">
        <span class="text-label-small">Tipo</span>
        <AkSelect v-model="kind" class="filter-kind">
          <option value="EVENT">Eventos</option>
          <option value="REQUEST">Requisições</option>
          <option value="ALL">Todos</option>
        </AkSelect>
      </label>

      <label class="form-field">
        <span class="text-label-small">Ação</span>
        <AkSelect
          v-model="action"
          class="filter-action"
          :class="{ 'filter-disabled': !actionFilterEnabled }"
        >
          <option value="">Todas</option>
          <template v-if="actionFilterEnabled">
            <option v-for="name in actions" :key="name" :value="name">
              {{ auditActionLabel(name) }}
            </option>
          </template>
        </AkSelect>
      </label>

      <label class="form-field form-field--wide">
        <span class="text-label-small">E-mail do usuário</span>
        <AkInput v-model="user" class="filter-user" placeholder="Parte do e-mail" />
      </label>

      <label class="form-field">
        <span class="text-label-small">De</span>
        <AkInput v-model="from" type="date" class="filter-from" />
      </label>

      <label class="form-field">
        <span class="text-label-small">Até</span>
        <AkInput v-model="to" type="date" class="filter-to" />
      </label>

      <AkButton type="button" class="clear-filters" @click="clearFilters">Limpar filtros</AkButton>
    </form>

    <div v-if="status === 'loading' && entries.length === 0" class="text-muted">
      Carregando a auditoria…
    </div>
    <div v-else-if="status === 'error'" class="admin-feedback admin-feedback--error">
      <CircleAlert :size="19" />
      <span>{{ loadError }}</span>
    </div>
    <div v-else-if="entries.length === 0" class="text-muted">
      Nenhum registro com esses filtros.
    </div>

    <template v-else>
      <div class="table-wrapper">
        <table class="audit-table">
          <thead>
            <tr>
              <th scope="col">Data/hora</th>
              <th scope="col">Usuário</th>
              <th scope="col">Ação</th>
              <th scope="col">Alvo</th>
              <th scope="col">Detalhes</th>
              <th scope="col">IP</th>
              <th scope="col">Requisição</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in entries" :key="entry.id" class="audit-row">
              <td class="nowrap">{{ formatDateTime(entry.createdAt) }}</td>
              <td>
                <template v-if="entry.userEmail || entry.userName">
                  <div v-if="entry.userName" class="text-bold">{{ entry.userName }}</div>
                  <div class="text-muted">{{ entry.userEmail }}</div>
                </template>
                <span v-else-if="entry.userPseudonym" class="text-muted user-pseudonym">
                  {{ entry.userPseudonym }}
                </span>
                <span v-else class="text-muted">Anônimo</span>
              </td>
              <td>
                <span class="badge" :class="isRequest(entry) ? 'badge--muted' : 'badge--event'">
                  {{ auditActionLabel(entry.action) }}
                </span>
              </td>
              <td>{{ target(entry) ?? '—' }}</td>
              <td class="details-cell">
                <details v-if="entry.details && hasDetails(entry)">
                  <summary class="details-summary">{{ detailsSummary(entry.details) }}</summary>
                  <pre class="details-json">{{ JSON.stringify(entry.details, null, 2) }}</pre>
                </details>
                <span v-else class="text-muted">—</span>
              </td>
              <td class="nowrap" :title="entry.userAgent ?? undefined">
                {{ entry.ipAddress ?? '—' }}
              </td>
              <td>
                <div v-if="entry.path" class="request-info">
                  <span class="text-bold">{{ entry.httpMethod }}</span>
                  <span class="request-path">{{ entry.path }}</span>
                  <span class="text-muted nowrap">
                    {{ entry.statusCode ?? '—' }}
                    <template v-if="entry.durationMs !== null"
                      >· {{ entry.durationMs }} ms</template
                    >
                  </span>
                </div>
                <span v-else class="text-muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <AkPaginator :page="page" :total-pages="totalPages" @change="changePage" />
    </template>
  </main>
</template>

<style scoped>
.ak-admin-audit {
  padding: var(--spacing-10);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}
.admin-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}
.audit-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--spacing-4);
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  min-width: 160px;
}
.form-field--wide {
  min-width: 240px;
}
.filter-disabled {
  opacity: 0.5;
  pointer-events: none;
}
.admin-feedback {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-4);
  border-radius: var(--round-lg);
}
.admin-feedback--error {
  color: var(--color-wine);
  background-color: var(--color-wine-lighest);
}
.table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  background-color: var(--color-white);
}
.audit-table {
  width: 100%;
  border-collapse: collapse;
}
.audit-table th,
.audit-table td {
  padding: var(--spacing-3) var(--spacing-4);
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--color-border);
}
.audit-table th {
  font-size: var(--font-sm);
  font-weight: 700;
  color: var(--color-text-muted);
  white-space: nowrap;
}
.audit-table tbody tr:last-child td {
  border-bottom: none;
}
.nowrap {
  white-space: nowrap;
}
.badge {
  display: inline-flex;
  font-size: var(--font-sm);
  font-weight: 700;
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--round-lg);
  white-space: nowrap;
}
.badge--event {
  color: var(--color-primary);
  background-color: var(--color-primary-selected);
}
.badge--muted {
  color: var(--color-text-muted);
  background-color: var(--color-background-hover);
}
.details-cell {
  max-width: 320px;
}
.details-summary {
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
details[open] .details-summary {
  white-space: normal;
}
.details-json {
  margin-top: var(--spacing-2);
  padding: var(--spacing-3);
  border-radius: var(--round-md);
  background-color: var(--color-foreground);
  font-size: var(--font-sm);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.request-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  min-width: 200px;
}
.request-path {
  font-family: monospace;
  font-size: var(--font-sm);
  overflow-wrap: anywhere;
}
</style>
