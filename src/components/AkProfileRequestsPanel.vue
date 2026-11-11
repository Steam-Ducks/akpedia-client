<script setup lang="ts">
import { ArrowRight, Check, CircleAlert, CircleCheckBig, X } from '@lucide/vue'
import {
  approveProfileRequest,
  fetchProfileRequests,
  rejectProfileRequest,
} from '@/services/admin-profile-requests'
import type { ChangeRequest } from '@/types/Profile'
import { confirmAction } from '@/utils/confirm'
import { formatCpf } from '@/utils/cpf'
import { formatDate } from '@/utils/date'

const PAGE_SIZE = 50

const emit = defineEmits<{
  /** How many requests wait for a decision, for the tab's badge. */
  count: [total: number]
  /** A request was approved, so a user's e-mail or CPF changed. */
  approved: [request: ChangeRequest]
}>()

const FIELD_LABELS = { email: 'E-mail', cpf: 'CPF' } as const

const requests = ref<ChangeRequest[]>([])
const total = ref(0)
const status = ref<'loading' | 'done' | 'error'>('loading')
const loadError = ref<string | null>(null)

const busyId = ref<number | null>(null)
const actionError = ref<string | null>(null)
const actionSuccess = ref<string | null>(null)

/** The request being turned down, with the optional note for the user. */
const rejectingId = ref<number | null>(null)
const rejectNote = ref('')

const show = (request: ChangeRequest, value: string | null | undefined) =>
  (request.field === 'cpf' ? formatCpf(value) : value) || '—'

/** The e-mail on the account is the current one; the CPF is not in the request. */
const currentValue = (request: ChangeRequest) =>
  request.field === 'email' ? (request.user?.email ?? null) : null

const who = (request: ChangeRequest) => request.user?.name || request.user?.email || 'Usuário'

const setTotal = (value: number) => {
  total.value = value
  emit('count', value)
}

const load = async () => {
  status.value = 'loading'
  loadError.value = null
  try {
    const page = await fetchProfileRequests({ status: 'PENDING', page: 0, size: PAGE_SIZE })
    requests.value = page.content
    setTotal(page.totalElements)
    status.value = 'done'
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Não foi possível carregar as solicitações.'
    status.value = 'error'
  }
}

const remove = (id: number) => {
  requests.value = requests.value.filter((request) => request.id !== id)
  setTotal(Math.max(0, total.value - 1))
}

const clearFeedback = () => {
  actionError.value = null
  actionSuccess.value = null
}

const approve = async (request: ChangeRequest) => {
  const current = currentValue(request)
  const confirmed = await confirmAction({
    title: `Aprovar a alteração de ${FIELD_LABELS[request.field]}?`,
    text:
      `${FIELD_LABELS[request.field]} de ${who(request)} ` +
      (current ? `passa de ${show(request, current)} para ` : 'passa a ser ') +
      `${show(request, request.newValue)}.` +
      (request.field === 'email' ? ' A pessoa passa a entrar com o novo e-mail.' : ''),
    confirmText: 'Aprovar',
  })
  if (!confirmed) return
  clearFeedback()
  busyId.value = request.id
  try {
    const decided = await approveProfileRequest(request.id)
    remove(request.id)
    actionSuccess.value =
      request.field === 'email'
        ? `E-mail de ${who(request)} alterado. A pessoa passa a entrar com ${request.newValue}.`
        : `CPF de ${who(request)} alterado.`
    emit('approved', decided)
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Não foi possível aprovar a solicitação.'
  } finally {
    busyId.value = null
  }
}

const startRejecting = (request: ChangeRequest) => {
  clearFeedback()
  rejectingId.value = request.id
  rejectNote.value = ''
}

const reject = async (request: ChangeRequest) => {
  clearFeedback()
  busyId.value = request.id
  try {
    await rejectProfileRequest(request.id, rejectNote.value)
    remove(request.id)
    rejectingId.value = null
    actionSuccess.value = `Solicitação de ${who(request)} recusada.`
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Não foi possível recusar a solicitação.'
  } finally {
    busyId.value = null
  }
}

defineExpose({ load })

onMounted(load)
</script>

<template>
  <section class="ak-profile-requests">
    <div class="text-muted">
      Pedidos dos usuários para alterar e-mail ou CPF, que eles não mudam sozinhos. Aprovado, o novo
      valor é gravado no Keycloak; o e-mail também é o login da pessoa.
    </div>

    <div v-if="actionError" class="feedback feedback--error" role="alert">
      <CircleAlert :size="19" />
      <span>{{ actionError }}</span>
    </div>
    <div v-if="actionSuccess" class="feedback feedback--success" role="status">
      <CircleCheckBig :size="19" />
      <span>{{ actionSuccess }}</span>
    </div>

    <div v-if="status === 'loading'" class="text-muted">Carregando as solicitações…</div>
    <div v-else-if="status === 'error'" class="feedback feedback--error">
      <CircleAlert :size="19" />
      <span>{{ loadError }}</span>
    </div>
    <div v-else-if="requests.length === 0" class="empty-state text-muted">
      Nenhuma solicitação pendente.
    </div>

    <div v-else class="table-wrapper">
      <table class="requests-table">
        <thead>
          <tr>
            <th scope="col">Usuário</th>
            <th scope="col">Campo</th>
            <th scope="col">Alteração</th>
            <th scope="col">Motivo</th>
            <th scope="col">Pedida em</th>
            <th scope="col"><span class="visually-hidden">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="request in requests" :key="request.id">
            <tr class="request-row" :data-request-id="request.id">
              <td>
                <div class="text-bold">{{ request.user?.name || '—' }}</div>
                <div class="text-muted cell-small">{{ request.user?.email }}</div>
              </td>
              <td>
                <span class="badge">{{ FIELD_LABELS[request.field] }}</span>
              </td>
              <td>
                <div class="change">
                  <span v-if="currentValue(request)" class="text-muted change-old">
                    {{ show(request, currentValue(request)) }}
                  </span>
                  <ArrowRight
                    v-if="currentValue(request)"
                    :size="16"
                    class="change-arrow"
                    aria-label="para"
                  />
                  <span class="text-bold change-new">{{ show(request, request.newValue) }}</span>
                </div>
              </td>
              <td class="cell-reason">
                <span v-if="request.reason">{{ request.reason }}</span>
                <span v-else class="text-muted">—</span>
              </td>
              <td class="cell-date">{{ formatDate(request.createdAt) }}</td>
              <td>
                <div class="row-actions">
                  <AkButton
                    type="button"
                    color="primary"
                    class="row-action approve-request"
                    :disabled="busyId === request.id"
                    @click="approve(request)"
                  >
                    <Check :size="16" />
                    Aprovar
                  </AkButton>
                  <AkButton
                    type="button"
                    class="row-action reject-request"
                    :disabled="busyId === request.id"
                    @click="
                      rejectingId === request.id ? (rejectingId = null) : startRejecting(request)
                    "
                  >
                    <X :size="16" />
                    Recusar
                  </AkButton>
                </div>
              </td>
            </tr>
            <tr v-if="rejectingId === request.id" class="reject-row">
              <td colspan="6">
                <form class="reject-form" @submit.prevent="reject(request)">
                  <label class="form-field">
                    <span class="text-label-small">
                      Motivo da recusa (opcional, aparece para {{ who(request) }})
                    </span>
                    <AkTextarea v-model="rejectNote" class="reject-note" :rows="2" />
                  </label>
                  <div class="reject-actions">
                    <AkButton type="button" class="row-action" @click="rejectingId = null">
                      Voltar
                    </AkButton>
                    <AkButton
                      type="submit"
                      color="danger"
                      class="row-action confirm-reject"
                      :disabled="busyId === request.id || rejectNote.length > 500"
                    >
                      {{ busyId === request.id ? 'Recusando…' : 'Recusar solicitação' }}
                    </AkButton>
                  </div>
                </form>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style lang="css" scoped>
.ak-profile-requests {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}
.empty-state {
  padding: var(--spacing-8);
  text-align: center;
  border: 1px dashed var(--color-border);
  border-radius: var(--round-lg);
}
.feedback {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-4);
  border-radius: var(--round-lg);
}
.feedback--error {
  color: var(--color-wine);
  background-color: var(--color-wine-lighest);
}
.feedback--success {
  color: var(--color-text);
  background-color: var(--color-background-hover);
}
.table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  background-color: var(--color-white);
}
.requests-table {
  width: 100%;
  border-collapse: collapse;
}
.requests-table th,
.requests-table td {
  padding: var(--spacing-3) var(--spacing-4);
  text-align: left;
  vertical-align: middle;
  border-bottom: 1px solid var(--color-border);
}
.requests-table th {
  font-size: var(--font-sm);
  font-weight: 700;
  color: var(--color-text-muted);
  white-space: nowrap;
}
.requests-table tbody tr:last-child td {
  border-bottom: none;
}
.cell-small {
  font-size: var(--font-sm);
}
.cell-reason {
  max-width: 280px;
  overflow-wrap: anywhere;
}
.cell-date {
  white-space: nowrap;
}
.change {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  overflow-wrap: anywhere;
}
.change-old {
  text-decoration: line-through;
}
.change-arrow {
  color: var(--color-text-muted);
  flex: none;
}
.badge {
  display: inline-flex;
  align-items: center;
  font-size: var(--font-sm);
  font-weight: 700;
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--round-lg);
  white-space: nowrap;
  color: var(--color-primary);
  background-color: var(--color-primary-selected);
}
.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-2);
}
.row-action {
  padding: var(--spacing-2) var(--spacing-3);
  font-size: var(--font-sm);
  white-space: nowrap;
}
.row-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.reject-row td {
  background-color: var(--color-foreground);
}
.reject-form {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: var(--spacing-4);
}
.reject-form .form-field {
  flex: 1;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}
.reject-actions {
  display: flex;
  gap: var(--spacing-2);
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
