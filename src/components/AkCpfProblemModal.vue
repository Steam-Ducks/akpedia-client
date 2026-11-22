<script setup lang="ts">
import { CircleAlert, Clock, LogOut, RefreshCw, Send } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import logoUrl from '@/assets/images/akpedia-logo.png'
import { logout } from '@/services/auth'
import { createChangeRequest, fetchMyChangeRequests } from '@/services/profile'
import { useCpfStore } from '@/stores/cpf-store'
import type { ChangeRequest } from '@/types/Profile'
import { cpfProblem, formatCpf } from '@/utils/cpf'
import { formatDate } from '@/utils/date'

const MAX_REASON = 500

const cpfStore = useCpfStore()
const { problem, checking } = storeToRefs(cpfStore)

/** The user's latest CPF request, which says what to show: the form, or that one is waiting. */
const latest = ref<ChangeRequest | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)

const newCpf = ref('')
const reason = ref('')
const sending = ref(false)
const error = ref<string | null>(null)
const stillRefused = ref(false)
const dialog = ref<HTMLElement | null>(null)

const explanation = computed(() =>
  problem.value === 'cpf_taken'
    ? 'O CPF cadastrado na sua conta já pertence a outro usuário.'
    : 'O CPF cadastrado na sua conta é inválido: os dígitos verificadores não conferem.',
)

const waiting = computed(() => latest.value?.status === 'PENDING')
const rejected = computed(() => (latest.value?.status === 'REJECTED' ? latest.value : null))

const cpfHint = computed(() => (newCpf.value.trim() ? cpfProblem(newCpf.value) : null))
const canSend = computed(
  () =>
    !sending.value &&
    newCpf.value.trim() !== '' &&
    cpfHint.value === null &&
    reason.value.length <= MAX_REASON,
)

const load = async () => {
  loading.value = true
  loadError.value = null
  try {
    const requests = await fetchMyChangeRequests()
    latest.value = requests.find((request) => request.field === 'cpf') ?? null
  } catch (e) {
    loadError.value =
      e instanceof Error ? e.message : 'Não foi possível carregar as suas solicitações.'
  } finally {
    loading.value = false
  }
  // Approved since the last login: the token still has the old CPF, a new one has the right one.
  if (latest.value?.status === 'APPROVED') await recheck()
}

const send = async () => {
  if (!canSend.value) return
  sending.value = true
  error.value = null
  try {
    latest.value = await createChangeRequest({
      field: 'cpf',
      newValue: newCpf.value,
      reason: reason.value,
    })
    newCpf.value = ''
    reason.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Não foi possível enviar a solicitação.'
  } finally {
    sending.value = false
  }
}

/** After an admin's decision: the dialog closes once the server takes the CPF. */
const recheck = async () => {
  stillRefused.value = false
  await cpfStore.recheck()
  if (problem.value) {
    stillRefused.value = true
    const requests = await fetchMyChangeRequests().catch(() => null)
    if (requests) latest.value = requests.find((request) => request.field === 'cpf') ?? null
  }
}

// The rest of the app is inert behind the dialog. Esc does nothing on purpose: the CPF has to be
// corrected first, or the user logs out.
onMounted(async () => {
  dialog.value?.focus()
  await load()
})
</script>

<template>
  <div class="ak-cpf-modal">
    <div
      ref="dialog"
      class="cpf-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cpf-title"
      aria-describedby="cpf-intro"
      tabindex="-1"
    >
      <div class="cpf-header">
        <img :src="logoUrl" alt="Akpedia" class="cpf-logo" />
        <div id="cpf-title" class="text-title-large">Seu CPF precisa ser corrigido</div>
        <div id="cpf-intro" class="text-muted">
          {{ explanation }} Para usar o Akpedia, envie o CPF certo; um administrador vai analisar o
          pedido.
        </div>
      </div>

      <div v-if="loading" class="text-muted">Carregando…</div>

      <div v-else-if="loadError" class="cpf-error" role="alert">
        <CircleAlert :size="19" />
        <span>{{ loadError }}</span>
      </div>

      <template v-else-if="waiting && latest">
        <div class="cpf-notice">
          <Clock :size="19" />
          <span>
            Pedido enviado em {{ formatDate(latest.createdAt) }} com o CPF
            <strong>{{ formatCpf(latest.newValue) }}</strong
            >. Aguarde a análise de um administrador.
          </span>
        </div>
        <div v-if="stillRefused" class="text-muted">
          O pedido ainda não foi aprovado. Tente de novo mais tarde.
        </div>
      </template>

      <form v-else id="cpf-request-form" class="cpf-form" @submit.prevent="send">
        <div v-if="rejected" class="cpf-error" role="status">
          <CircleAlert :size="19" />
          <span>
            Seu pedido anterior (CPF {{ formatCpf(rejected.newValue) }}) foi recusado<template
              v-if="rejected.decisionNote"
              >: {{ rejected.decisionNote }}</template
            >. Confira o número e envie de novo.
          </span>
        </div>

        <label class="form-field">
          <span class="text-label-small">CPF correto</span>
          <AkInput v-model="newCpf" class="cpf-value" type="text" placeholder="000.000.000-00" />
          <span v-if="cpfHint" class="text-muted field-hint">{{ cpfHint }}</span>
        </label>

        <label class="form-field">
          <span class="text-label-small">Observação (opcional)</span>
          <AkTextarea
            v-model="reason"
            class="cpf-reason"
            :rows="3"
            placeholder="Algo que ajude o administrador a conferir."
          />
          <span v-if="reason.length > MAX_REASON" class="text-muted field-hint">
            A observação pode ter até {{ MAX_REASON }} caracteres.
          </span>
        </label>

        <div v-if="error" class="cpf-error" role="alert">
          <CircleAlert :size="19" />
          <span>{{ error }}</span>
        </div>
      </form>

      <div class="cpf-actions">
        <AkButton type="button" class="cpf-logout" @click="logout()">
          <LogOut :size="17" />
          Sair
        </AkButton>
        <AkButton v-if="loadError" type="button" color="primary" class="cpf-retry" @click="load">
          Tentar novamente
        </AkButton>
        <AkButton
          v-else-if="waiting"
          type="button"
          color="primary"
          class="cpf-recheck"
          :disabled="checking"
          @click="recheck"
        >
          <RefreshCw :size="17" />
          {{ checking ? 'Verificando…' : 'Verificar novamente' }}
        </AkButton>
        <AkButton
          v-else-if="!loading"
          type="submit"
          form="cpf-request-form"
          color="primary"
          class="cpf-send"
          :disabled="!canSend"
        >
          <Send :size="17" />
          {{ sending ? 'Enviando…' : 'Enviar para análise' }}
        </AkButton>
      </div>
    </div>
  </div>
</template>

<style lang="css" scoped>
.ak-cpf-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-5);
  background-color: rgb(from var(--color-black) r g b / 0.55);
}
.cpf-dialog {
  width: 100%;
  max-width: 520px;
  max-height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-5);
  padding: var(--spacing-8);
  border-radius: var(--round-lg);
  background-color: var(--color-foreground);
  box-shadow: var(--elevation-2);
  outline: none;
}
.cpf-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}
.cpf-header .text-muted {
  line-height: 1.4;
}
.cpf-logo {
  display: block;
  width: 100%;
  max-width: 120px;
  height: auto;
  margin-bottom: var(--spacing-2);
}
.cpf-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}
.field-hint {
  font-size: var(--font-sm);
}
.cpf-notice {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-2);
  padding: var(--spacing-4);
  border-radius: var(--round-lg);
  background-color: var(--color-primary-selected);
  color: var(--color-primary);
  line-height: 1.4;
}
.cpf-error {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-2);
  padding: var(--spacing-4);
  border-radius: var(--round-lg);
  color: var(--color-wine);
  background-color: var(--color-wine-lighest);
  line-height: 1.4;
}
.cpf-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--spacing-3);
}
.cpf-send:disabled,
.cpf-recheck:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
