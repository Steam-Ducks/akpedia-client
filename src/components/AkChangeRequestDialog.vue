<script setup lang="ts">
import { CircleAlert, Send } from '@lucide/vue'
import { createChangeRequest } from '@/services/profile'
import type { ChangeRequest, RequestableProfileField } from '@/types/Profile'
import { cpfProblem, formatCpf } from '@/utils/cpf'

type Props = {
  field: RequestableProfileField
  /** What the account holds today, shown for reference. */
  currentValue: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{ cancel: []; created: [request: ChangeRequest] }>()

const MAX_REASON = 500

const newValue = ref('')
const reason = ref('')
const sending = ref(false)
const error = ref<string | null>(null)
const dialog = ref<HTMLElement | null>(null)

const isCpf = computed(() => props.field === 'cpf')
const fieldLabel = computed(() => (isCpf.value ? 'CPF' : 'e-mail'))
const current = computed(() =>
  isCpf.value ? formatCpf(props.currentValue) : (props.currentValue ?? ''),
)

/** Only a light check here; the server has the last word (format, same value, taken e-mail). */
const valueHint = computed(() => {
  const value = newValue.value.trim()
  if (!value) return null
  if (isCpf.value) return cpfProblem(value)
  if (!isCpf.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Informe um e-mail válido.'
  return null
})

const canSend = computed(
  () =>
    !sending.value &&
    newValue.value.trim() !== '' &&
    valueHint.value === null &&
    reason.value.length <= MAX_REASON,
)

const cancel = () => {
  if (!sending.value) emit('cancel')
}

const send = async () => {
  if (!canSend.value) return
  sending.value = true
  error.value = null
  try {
    const created = await createChangeRequest({
      field: props.field,
      newValue: newValue.value,
      reason: reason.value,
    })
    emit('created', created)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Não foi possível enviar a solicitação.'
  } finally {
    sending.value = false
  }
}

onMounted(() => dialog.value?.querySelector('input')?.focus())
</script>

<template>
  <div class="ak-change-request" @click.self="cancel">
    <form
      ref="dialog"
      class="request-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-request-title"
      @submit.prevent="send"
      @keydown.esc="cancel"
    >
      <div id="change-request-title" class="text-title-small">
        Solicitar alteração de {{ fieldLabel }}
      </div>
      <div v-if="current" class="text-muted">
        Atual: <span class="current-value">{{ current }}</span>
      </div>

      <label class="form-field">
        <span class="text-label-small">{{ isCpf ? 'Novo CPF' : 'Novo e-mail' }}</span>
        <AkInput
          v-model="newValue"
          class="request-value"
          :type="isCpf ? 'text' : 'email'"
          :placeholder="isCpf ? '000.000.000-00' : 'nome@exemplo.com'"
        />
        <span v-if="valueHint" class="text-muted field-hint">{{ valueHint }}</span>
      </label>

      <label class="form-field">
        <span class="text-label-small">Motivo (opcional)</span>
        <AkTextarea
          v-model="reason"
          class="request-reason"
          :rows="3"
          placeholder="Conte ao administrador por que o dado mudou."
        />
        <span v-if="reason.length > MAX_REASON" class="text-muted field-hint">
          O motivo pode ter até {{ MAX_REASON }} caracteres.
        </span>
      </label>

      <div class="text-muted request-note">
        Um administrador vai analisar o pedido.
        <template v-if="!isCpf"> Aprovado, o novo e-mail passa a ser o seu login.</template>
      </div>

      <div v-if="error" class="request-error" role="alert">
        <CircleAlert :size="19" />
        <span>{{ error }}</span>
      </div>

      <div class="request-actions">
        <AkButton type="button" class="request-cancel" :disabled="sending" @click="cancel">
          Cancelar
        </AkButton>
        <AkButton type="submit" color="primary" class="request-send" :disabled="!canSend">
          <Send :size="17" />
          {{ sending ? 'Enviando…' : 'Enviar solicitação' }}
        </AkButton>
      </div>
    </form>
  </div>
</template>

<style lang="css" scoped>
.ak-change-request {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-5);
  background-color: rgb(from var(--color-black) r g b / 0.55);
}
.request-dialog {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  padding: var(--spacing-8);
  border-radius: var(--round-lg);
  background-color: var(--color-foreground);
  box-shadow: var(--elevation-2);
}
.current-value {
  color: var(--color-text);
  font-weight: 600;
  overflow-wrap: anywhere;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}
.field-hint {
  font-size: var(--font-sm);
}
.request-note {
  line-height: 1.4;
}
.request-error {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-4);
  border-radius: var(--round-lg);
  color: var(--color-wine);
  background-color: var(--color-wine-lighest);
}
.request-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3);
}
.request-send:disabled,
.request-cancel:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
