<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import { deleteMyAccount } from '@/services/account'
import { logout } from '@/services/auth'

type Props = {
  /**
   * Runs first, e.g. recording that the terms were declined. If it fails, nothing is deleted and
   * its message is shown.
   */
  beforeDelete?: () => Promise<void>
}

const props = defineProps<Props>()
const emit = defineEmits<{ cancel: [] }>()

/** What has to be typed to confirm the deletion. */
const CONFIRM_WORD = 'EXCLUIR'

const confirmText = ref('')
const deleting = ref(false)
const error = ref<string | null>(null)
const dialog = ref<HTMLElement | null>(null)

const canDelete = computed(() => confirmText.value.trim() === CONFIRM_WORD && !deleting.value)

const cancel = () => {
  if (!deleting.value) emit('cancel')
}

const deleteAccount = async () => {
  if (!canDelete.value) return
  deleting.value = true
  error.value = null
  try {
    await props.beforeDelete?.()
    await deleteMyAccount()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Não foi possível excluir a sua conta.'
    deleting.value = false
    return
  }
  // The account is gone: end the Keycloak session too.
  await logout()
}

onMounted(() => dialog.value?.querySelector('input')?.focus())
</script>

<template>
  <div class="ak-delete-account" @click.self="cancel">
    <form
      ref="dialog"
      class="confirm-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      aria-describedby="delete-account-warning"
      @submit.prevent="deleteAccount"
      @keydown.esc="cancel"
    >
      <div id="delete-account-title" class="text-title-small">Excluir a sua conta?</div>
      <div id="delete-account-warning" class="text-muted confirm-warning">
        A sua conta e os seus dados pessoais serão excluídos, e isso não pode ser desfeito. Para
        voltar a usar o Akpedia, só um administrador poderá cadastrá-lo de novo.
      </div>
      <div class="text-muted">
        Para confirmar, digite <strong>{{ CONFIRM_WORD }}</strong
        >.
      </div>
      <AkInput v-model="confirmText" class="confirm-input" :placeholder="CONFIRM_WORD" />
      <div v-if="error" class="confirm-error" role="alert">
        <CircleAlert :size="19" />
        <span>{{ error }}</span>
      </div>
      <div class="confirm-actions">
        <AkButton type="button" class="confirm-cancel" :disabled="deleting" @click="cancel">
          Cancelar
        </AkButton>
        <AkButton type="submit" color="danger" class="confirm-delete" :disabled="!canDelete">
          {{ deleting ? 'Excluindo…' : 'Excluir conta' }}
        </AkButton>
      </div>
    </form>
  </div>
</template>

<style lang="css" scoped>
.ak-delete-account {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-5);
  background-color: rgb(from var(--color-black) r g b / 0.55);
}
.confirm-dialog {
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
.confirm-warning {
  line-height: 1.4;
}
.confirm-error {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-4);
  border-radius: var(--round-lg);
  color: var(--color-wine);
  background-color: var(--color-wine-lighest);
}
.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3);
}
.confirm-delete:disabled,
.confirm-cancel:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
