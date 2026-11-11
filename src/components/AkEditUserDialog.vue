<script setup lang="ts">
import { CircleAlert, TriangleAlert } from '@lucide/vue'
import { adminProfileOf, updateUserProfile } from '@/services/admin-users'
import { SECTORS } from '@/types/AdminUser'
import type { AdminUser } from '@/types/AdminUser'
import { cpfDigits, cpfProblem } from '@/utils/cpf'
import { confirmAction } from '@/utils/confirm'

type Props = {
  user: AdminUser
}

const props = defineProps<Props>()
const emit = defineEmits<{ cancel: []; saved: [user: AdminUser] }>()

const saving = ref(false)
const error = ref<string | null>(null)
const dialog = ref<HTMLElement | null>(null)

/** What the account holds, to tell what changed. */
const original = adminProfileOf(props.user)
const form = ref({ ...original })

const emailChanged = computed(
  () => form.value.email.trim().toLowerCase() !== original.email.toLowerCase(),
)
const dirty = computed(
  () =>
    form.value.firstName.trim() !== original.firstName ||
    form.value.lastName.trim() !== original.lastName ||
    form.value.email.trim() !== original.email ||
    cpfDigits(form.value.cpf) !== cpfDigits(original.cpf) ||
    form.value.sector !== original.sector,
)
const cpfError = computed(() => cpfProblem(form.value.cpf))
const canSave = computed(
  () =>
    dirty.value &&
    !saving.value &&
    !cpfError.value &&
    [form.value.firstName, form.value.lastName, form.value.email, form.value.sector].every(
      (field) => field.trim(),
    ),
)

const cancel = () => {
  if (!saving.value) emit('cancel')
}

const save = async () => {
  if (!canSave.value) return
  const who = props.user.name || props.user.email
  const confirmed = await confirmAction({
    title: `Salvar os dados de ${who}?`,
    text: emailChanged.value
      ? 'O novo e-mail passa a ser o login da pessoa.'
      : 'As mudanças chegam à pessoa na próxima renovação da sessão dela.',
    confirmText: 'Salvar',
  })
  if (!confirmed) return
  saving.value = true
  error.value = null
  try {
    const updated = await updateUserProfile(props.user.id, { ...form.value })
    emit('saved', updated)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Não foi possível salvar os dados do usuário.'
  } finally {
    saving.value = false
  }
}

onMounted(() => dialog.value?.querySelector('input')?.focus())
</script>

<template>
  <div class="ak-edit-user" @click.self="cancel">
    <form
      ref="dialog"
      class="edit-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-user-title"
      @submit.prevent="save"
      @keydown.esc="cancel"
    >
      <div id="edit-user-title" class="text-title-small">
        Editar dados de {{ user.name || user.email }}
      </div>

      <div class="edit-grid">
        <label class="form-field">
          <span class="text-label-small">Nome</span>
          <AkInput v-model="form.firstName" class="edit-first-name" />
        </label>
        <label class="form-field">
          <span class="text-label-small">Sobrenome</span>
          <AkInput v-model="form.lastName" class="edit-last-name" />
        </label>
        <label class="form-field">
          <span class="text-label-small">E-mail</span>
          <AkInput v-model="form.email" type="email" class="edit-email" />
        </label>
        <label class="form-field">
          <span class="text-label-small">CPF</span>
          <AkInput v-model="form.cpf" class="edit-cpf" placeholder="000.000.000-00" />
          <span v-if="cpfError" class="text-muted field-hint">{{ cpfError }}</span>
        </label>
        <label class="form-field">
          <span class="text-label-small">Setor</span>
          <AkSelect v-model="form.sector" class="edit-sector" required>
            <option value="" disabled>Escolha o setor</option>
            <option v-for="sector in SECTORS" :key="sector" :value="sector">{{ sector }}</option>
          </AkSelect>
        </label>
      </div>

      <div v-if="emailChanged" class="feedback feedback--warning email-warning">
        <TriangleAlert :size="19" />
        <span>O e-mail é o login: a pessoa passa a entrar com o novo e-mail.</span>
      </div>
      <div class="text-muted edit-note">
        Nome e setor aparecem para a pessoa na próxima renovação da sessão dela.
      </div>

      <div v-if="error" class="feedback feedback--error" role="alert">
        <CircleAlert :size="19" />
        <span>{{ error }}</span>
      </div>

      <div class="edit-actions">
        <AkButton type="button" class="edit-cancel" :disabled="saving" @click="cancel">
          Cancelar
        </AkButton>
        <AkButton type="submit" color="primary" class="edit-save" :disabled="!canSave">
          {{ saving ? 'Salvando…' : 'Salvar' }}
        </AkButton>
      </div>
    </form>
  </div>
</template>

<style lang="css" scoped>
.ak-edit-user {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-5);
  background-color: rgb(from var(--color-black) r g b / 0.55);
}
.edit-dialog {
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  padding: var(--spacing-8);
  border-radius: var(--round-lg);
  background-color: var(--color-foreground);
  box-shadow: var(--elevation-2);
}
.edit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--spacing-4);
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}
.field-hint,
.edit-note {
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
.feedback--warning {
  color: var(--color-text);
  background-color: var(--color-background-hover);
}
.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3);
}
.edit-save:disabled,
.edit-cancel:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
