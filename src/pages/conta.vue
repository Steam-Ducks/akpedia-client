<script setup lang="ts">
import {
  CircleAlert,
  CircleCheckBig,
  Clock,
  Mail,
  PencilLine,
  Building2,
  Trash2,
  XCircle,
} from '@lucide/vue'
import AkChangeRequestDialog from '@/components/AkChangeRequestDialog.vue'
import { refreshSession, sessionUser } from '@/services/auth'
import {
  cancelChangeRequest,
  fetchMyChangeRequests,
  fetchMyProfile,
  updateMyProfile,
} from '@/services/profile'
import { SECTORS } from '@/types/AdminUser'
import type {
  ChangeRequest,
  ChangeRequestStatus,
  Profile,
  RequestableProfileField,
} from '@/types/Profile'
import { confirmAction } from '@/utils/confirm'
import { formatCpf } from '@/utils/cpf'
import { formatDate } from '@/utils/date'

/** The app's realm roles, in order; Keycloak's own (offline_access...) are left out. */
const ROLE_LABELS: Record<string, string> = {
  STANDARD: 'Padrão',
  APPROVER: 'Aprovador',
  ADMIN: 'Administrador',
}

const FIELD_LABELS: Record<RequestableProfileField, string> = { email: 'E-mail', cpf: 'CPF' }
const LOCKED_FIELDS: RequestableProfileField[] = ['email', 'cpf']

const STATUS_PRESENTATION: Record<
  ChangeRequestStatus,
  { label: string; tone: 'muted' | 'ok' | 'alert'; icon: unknown }
> = {
  PENDING: { label: 'Pendente', tone: 'muted', icon: Clock },
  APPROVED: { label: 'Aprovada', tone: 'ok', icon: CircleCheckBig },
  REJECTED: { label: 'Recusada', tone: 'alert', icon: XCircle },
}

const profile = ref<Profile | null>(null)
const status = ref<'loading' | 'done' | 'error'>('loading')
const loadError = ref<string | null>(null)

/** The form, filled from the profile; "Salvar" waits until it differs. */
const form = ref({ firstName: '', lastName: '', sector: '' })
const saving = ref(false)
const saveError = ref<string | null>(null)
const saveSuccess = ref<string | null>(null)

const requests = ref<ChangeRequest[]>([])
const requestsError = ref<string | null>(null)
const requestSuccess = ref<string | null>(null)
const cancellingId = ref<number | null>(null)

/** The field whose change request dialog is open. */
const requesting = ref<RequestableProfileField | null>(null)
const confirmingDelete = ref(false)

const roles = computed(() => profile.value?.roles ?? sessionUser.value?.roles ?? [])
const roleLabels = computed(() =>
  Object.keys(ROLE_LABELS)
    .filter((role) => roles.value.includes(role))
    .map((role) => ROLE_LABELS[role]),
)

const fullName = computed(() => {
  const name = profile.value
    ? `${profile.value.firstName} ${profile.value.lastName}`.trim()
    : sessionUser.value?.name
  return name || '—'
})
const email = computed(() => profile.value?.email ?? sessionUser.value?.email ?? '')
const sector = computed(() => profile.value?.sector ?? sessionUser.value?.sector ?? null)

/** First letters of the first and last names, as in the header. */
const initials = computed(() => {
  const words = fullName.value === '—' ? [] : fullName.value.split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return (words[0][0] + last).toUpperCase()
})

const fillForm = (from: Profile) => {
  form.value = { firstName: from.firstName, lastName: from.lastName, sector: from.sector ?? '' }
}

const dirty = computed(() => {
  const current = profile.value
  if (!current) return false
  return (
    form.value.firstName.trim() !== current.firstName ||
    form.value.lastName.trim() !== current.lastName ||
    form.value.sector !== (current.sector ?? '')
  )
})
const canSave = computed(
  () =>
    dirty.value &&
    !saving.value &&
    form.value.firstName.trim() !== '' &&
    form.value.lastName.trim() !== '' &&
    form.value.sector !== '',
)

const pendingFor = (field: RequestableProfileField) =>
  requests.value.find((request) => request.field === field && request.status === 'PENDING')

const pendingValue = (field: RequestableProfileField) => pendingFor(field)?.newValue ?? null

const showValue = (field: RequestableProfileField, value: string | null) =>
  (field === 'cpf' ? formatCpf(value) : value) || '—'

const load = async () => {
  status.value = 'loading'
  loadError.value = null
  try {
    profile.value = await fetchMyProfile()
    fillForm(profile.value)
    status.value = 'done'
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Não foi possível carregar os seus dados.'
    status.value = 'error'
  }
}

const loadRequests = async () => {
  requestsError.value = null
  try {
    requests.value = await fetchMyChangeRequests()
  } catch (e) {
    requestsError.value =
      e instanceof Error ? e.message : 'Não foi possível carregar as suas solicitações.'
  }
}

const save = async () => {
  if (!canSave.value) return
  saving.value = true
  saveError.value = null
  saveSuccess.value = null
  try {
    profile.value = await updateMyProfile({ ...form.value })
    fillForm(profile.value)
    saveSuccess.value = 'Dados salvos.'
    // The token still carries the old name: get a new one so the header shows the change.
    await refreshSession()
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Não foi possível salvar os seus dados.'
  } finally {
    saving.value = false
  }
}

const openRequest = (field: RequestableProfileField) => {
  requestSuccess.value = null
  requesting.value = field
}

const requestCreated = (request: ChangeRequest) => {
  requesting.value = null
  requests.value = [request, ...requests.value]
  requestSuccess.value = `Solicitação de alteração de ${FIELD_LABELS[request.field]} enviada. Um administrador vai analisar o pedido.`
}

const cancelRequest = async (request: ChangeRequest) => {
  const confirmed = await confirmAction({
    title: 'Cancelar a solicitação?',
    text: `A solicitação de alteração de ${FIELD_LABELS[request.field]} será cancelada e não chegará a um administrador.`,
    confirmText: 'Cancelar solicitação',
    cancelText: 'Voltar',
  })
  if (!confirmed) return
  cancellingId.value = request.id
  requestsError.value = null
  requestSuccess.value = null
  try {
    await cancelChangeRequest(request.id)
    requests.value = requests.value.filter((other) => other.id !== request.id)
  } catch (e) {
    requestsError.value =
      e instanceof Error ? e.message : 'Não foi possível cancelar a solicitação.'
  } finally {
    cancellingId.value = null
  }
}

onMounted(() => {
  load()
  loadRequests()
})
</script>

<template>
  <main class="ak-account">
    <section class="account-hero">
      <div class="hero-avatar" aria-hidden="true">{{ initials }}</div>
      <div class="hero-text">
        <div class="text-title-large profile-name">{{ fullName }}</div>
        <div class="hero-meta">
          <span class="hero-meta-item profile-email">
            <Mail :size="16" aria-hidden="true" />
            {{ email || '—' }}
          </span>
          <span v-if="sector" class="hero-meta-item profile-sector">
            <Building2 :size="16" aria-hidden="true" />
            {{ sector }}
          </span>
        </div>
        <div class="badge-list profile-roles">
          <span v-for="label in roleLabels" :key="label" class="badge badge--ok">{{ label }}</span>
        </div>
      </div>
    </section>

    <div class="account-layout">
      <section class="account-card personal-data">
        <div class="card-header">
          <div class="text-title-small">Dados pessoais</div>
          <div class="text-muted">
            Nome, sobrenome e setor você mesmo altera. E-mail e CPF só um administrador muda: peça a
            alteração e ela é aplicada quando for aprovada.
          </div>
        </div>

        <div v-if="status === 'loading'" class="text-muted">Carregando os seus dados…</div>
        <div v-else-if="status === 'error'" class="feedback feedback--error" role="alert">
          <CircleAlert :size="19" />
          <span>{{ loadError }}</span>
        </div>

        <template v-else-if="profile">
          <form class="profile-form" @submit.prevent="save">
            <div class="form-grid">
              <label class="form-field">
                <span class="text-label-small">Nome</span>
                <AkInput v-model="form.firstName" class="first-name" />
              </label>
              <label class="form-field">
                <span class="text-label-small">Sobrenome</span>
                <AkInput v-model="form.lastName" class="last-name" />
              </label>
              <label class="form-field">
                <span class="text-label-small">Setor</span>
                <AkSelect v-model="form.sector" class="sector" required>
                  <option value="" disabled>Escolha o setor</option>
                  <option v-for="option in SECTORS" :key="option" :value="option">
                    {{ option }}
                  </option>
                </AkSelect>
              </label>
            </div>

            <div v-if="saveError" class="feedback feedback--error" role="alert">
              <CircleAlert :size="19" />
              <span>{{ saveError }}</span>
            </div>
            <div v-if="saveSuccess" class="feedback feedback--success" role="status">
              <CircleCheckBig :size="19" />
              <span>{{ saveSuccess }}</span>
            </div>

            <div class="form-actions">
              <AkButton type="submit" color="primary" class="save-profile" :disabled="!canSave">
                {{ saving ? 'Salvando…' : 'Salvar' }}
              </AkButton>
            </div>
          </form>

          <div class="locked-fields">
            <div
              v-for="field in LOCKED_FIELDS"
              :key="field"
              class="locked-field"
              :class="`locked-${field}`"
            >
              <div class="locked-text">
                <span class="text-label-small">{{ FIELD_LABELS[field] }}</span>
                <span class="locked-value">{{ showValue(field, profile[field]) }}</span>
                <span v-if="pendingFor(field)" class="text-muted locked-pending">
                  Alteração para {{ showValue(field, pendingValue(field)) }} aguardando análise.
                </span>
              </div>
              <AkButton
                v-if="!pendingFor(field)"
                type="button"
                class="request-change"
                @click="openRequest(field)"
              >
                <PencilLine :size="17" />
                Solicitar alteração
              </AkButton>
              <span v-else class="badge badge--muted">
                <Clock :size="14" aria-hidden="true" />
                Pendente
              </span>
            </div>
          </div>

          <div v-if="requestSuccess" class="feedback feedback--success" role="status">
            <CircleCheckBig :size="19" />
            <span>{{ requestSuccess }}</span>
          </div>
        </template>
      </section>

      <div class="account-side">
        <section v-if="requests.length > 0 || requestsError" class="account-card requests-card">
          <div class="text-title-small">Solicitações</div>
          <div v-if="requestsError" class="feedback feedback--error" role="alert">
            <CircleAlert :size="19" />
            <span>{{ requestsError }}</span>
          </div>
          <ul class="request-list">
            <li
              v-for="request in requests"
              :key="request.id"
              class="request-item"
              :data-request-id="request.id"
            >
              <div class="request-top">
                <span class="text-bold">{{ FIELD_LABELS[request.field] }}</span>
                <span
                  class="badge request-status"
                  :class="`badge--${STATUS_PRESENTATION[request.status].tone}`"
                >
                  <component
                    :is="STATUS_PRESENTATION[request.status].icon"
                    :size="14"
                    aria-hidden="true"
                  />
                  {{ STATUS_PRESENTATION[request.status].label }}
                </span>
              </div>
              <div class="request-value">{{ showValue(request.field, request.newValue) }}</div>
              <div class="text-muted request-date">
                Pedida em {{ formatDate(request.createdAt) }}
                <template v-if="request.decidedAt">
                  · analisada em {{ formatDate(request.decidedAt) }}
                </template>
                <template v-if="request.decidedByName"> por {{ request.decidedByName }}</template>
              </div>
              <div v-if="request.reason" class="text-muted request-reason">
                Motivo: {{ request.reason }}
              </div>
              <div v-if="request.decisionNote" class="request-note">
                <span class="text-bold">Resposta:</span> {{ request.decisionNote }}
              </div>
              <div v-if="request.status === 'PENDING'" class="request-actions">
                <AkButton
                  type="button"
                  class="row-action cancel-request"
                  :disabled="cancellingId === request.id"
                  @click="cancelRequest(request)"
                >
                  {{ cancellingId === request.id ? 'Cancelando…' : 'Cancelar' }}
                </AkButton>
              </div>
            </li>
          </ul>
        </section>

        <section class="account-card danger-zone">
          <div class="text-title-small">Excluir conta</div>
          <div class="text-muted">
            A sua conta é excluída para sempre: você não consegue mais entrar e os seus dados
            pessoais são apagados. Os documentos que você enviou continuam no Akpedia, sem o seu
            nome. Para voltar a usar o Akpedia, só um administrador poderá cadastrá-lo de novo.
          </div>
          <div>
            <AkButton
              type="button"
              color="danger"
              class="delete-account"
              @click="confirmingDelete = true"
            >
              <Trash2 :size="19" />
              Excluir minha conta
            </AkButton>
          </div>
        </section>
      </div>
    </div>

    <AkChangeRequestDialog
      v-if="requesting && profile"
      :field="requesting"
      :current-value="profile[requesting]"
      @cancel="requesting = null"
      @created="requestCreated"
    />
    <AkDeleteAccountDialog v-if="confirmingDelete" @cancel="confirmingDelete = false" />
  </main>
</template>

<style scoped>
.ak-account {
  padding: var(--spacing-10);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
  max-width: 1400px;
}
.account-hero {
  display: flex;
  align-items: center;
  gap: var(--spacing-6);
  padding: var(--spacing-8);
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  background-color: var(--color-white);
}
.hero-avatar {
  flex: none;
  width: 96px;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--round-pill);
  font-size: 2.25rem;
  font-weight: 800;
  color: var(--color-white);
  background-color: var(--color-primary);
}
.hero-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}
.hero-text .profile-name {
  overflow-wrap: anywhere;
}
.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2) var(--spacing-5);
  color: var(--color-text-muted);
}
.hero-meta-item {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  overflow-wrap: anywhere;
}
/* The data form on the left; requests and the danger zone beside it. Stacked on narrow screens. */
.account-layout {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(320px, 2fr);
  gap: var(--spacing-6);
  align-items: start;
}
@media (max-width: 1100px) {
  .account-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
.account-side {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}
.account-card {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  background-color: var(--color-white);
  padding: var(--spacing-8);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-5);
}
.card-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}
.card-header .text-muted {
  line-height: 1.4;
}
.profile-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: var(--spacing-4);
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}
.form-actions {
  display: flex;
  justify-content: flex-end;
}
.save-profile:disabled,
.row-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.locked-fields {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--color-border);
}
.locked-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  padding: var(--spacing-4) 0;
  border-bottom: 1px solid var(--color-border);
}
.locked-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}
.locked-value {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.locked-pending {
  font-size: var(--font-sm);
}
.request-change {
  flex: none;
  padding: var(--spacing-2) var(--spacing-4);
  font-size: var(--font-sm);
}
.request-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}
.request-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  padding: var(--spacing-4);
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
}
.request-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3);
}
.request-value {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.request-date,
.request-reason {
  font-size: var(--font-sm);
}
.request-note {
  font-size: var(--font-sm);
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--round-md);
  background-color: var(--color-background-hover);
}
.request-actions {
  display: flex;
  justify-content: flex-end;
}
.row-action {
  padding: var(--spacing-2) var(--spacing-3);
  font-size: var(--font-sm);
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
.badge-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1);
}
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--font-sm);
  font-weight: 700;
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--round-lg);
  white-space: nowrap;
}
.badge--ok {
  color: var(--color-primary);
  background-color: var(--color-primary-selected);
}
.badge--muted {
  color: var(--color-text-muted);
  background-color: var(--color-background-hover);
}
.badge--alert {
  color: var(--color-white);
  background-color: var(--color-text);
}
.danger-zone {
  border-color: var(--color-wine-muted);
}
.danger-zone .text-muted {
  line-height: 1.4;
}
</style>
