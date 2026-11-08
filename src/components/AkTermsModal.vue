<script setup lang="ts">
import { CircleAlert, Trash2 } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import logoUrl from '@/assets/images/akpedia-logo.png'
import { useTermsStore } from '@/stores/terms-store'
import { formatDate } from '@/utils/date'

const termsStore = useTermsStore()
const { current, accepted, accepting, error } = storeToRefs(termsStore)

const dialog = ref<HTMLElement | null>(null)

/**
 * Not accepting means leaving for good: the confirmation records the refusal, deletes the account
 * and logs out. Until then the terms stay on screen, inert behind it.
 */
const confirmingDeletion = ref(false)

const cancelDeletion = async () => {
  confirmingDeletion.value = false
  await nextTick()
  dialog.value?.focus()
}

// The rest of the app is inert behind the dialog, so focus can only move inside it. Esc does
// nothing on purpose: the terms are accepted or the account is deleted.
onMounted(() => dialog.value?.focus())
</script>

<template>
  <div v-if="current" class="ak-terms-modal">
    <div
      ref="dialog"
      :inert="confirmingDeletion || undefined"
      :aria-hidden="confirmingDeletion ? 'true' : undefined"
      class="terms-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-title"
      aria-describedby="terms-intro"
      tabindex="-1"
    >
      <div class="terms-header">
        <img :src="logoUrl" alt="Akpedia" class="terms-logo" />
        <div id="terms-title" class="text-title-large">{{ current.title }}</div>
        <div class="text-muted">
          Versão {{ current.version }}, publicada em {{ formatDate(current.publishedAt) }}
        </div>
        <div id="terms-intro" class="text-muted">
          Para usar o Akpedia, leia e aceite os termos abaixo.
        </div>
      </div>

      <div v-if="accepted" class="terms-notice">
        Você aceitou a versão {{ accepted.version }}; os termos mudaram.
      </div>

      <div class="terms-content" tabindex="0">{{ current.content }}</div>

      <div v-if="error" class="terms-error" role="alert">
        <CircleAlert :size="19" />
        <span>{{ error }}</span>
      </div>

      <div class="terms-actions">
        <AkButton
          type="button"
          color="danger"
          class="terms-decline"
          :disabled="accepting"
          @click="confirmingDeletion = true"
        >
          <Trash2 :size="19" />
          Não aceito e desejo excluir minha conta
        </AkButton>
        <AkButton
          type="button"
          color="primary"
          class="terms-accept"
          :disabled="accepting"
          @click="termsStore.accept()"
        >
          {{ accepting ? 'Aceitando…' : 'Aceitar' }}
        </AkButton>
      </div>
    </div>
    <AkDeleteAccountDialog
      v-if="confirmingDeletion"
      :before-delete="termsStore.decline"
      @cancel="cancelDeletion"
    />
  </div>
</template>

<style lang="css" scoped>
.ak-terms-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-5);
  background-color: rgb(from var(--color-black) r g b / 0.55);
}
.terms-dialog {
  width: 100%;
  max-width: 720px;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-5);
  padding: var(--spacing-8);
  border-radius: var(--round-lg);
  background-color: var(--color-foreground);
  box-shadow: var(--elevation-2);
  outline: none;
}
.terms-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}
.terms-logo {
  display: block;
  width: 100%;
  max-width: 120px;
  height: auto;
  margin-bottom: var(--spacing-2);
}
.terms-notice {
  padding: var(--spacing-4);
  border-radius: var(--round-lg);
  background-color: var(--color-primary-selected);
  color: var(--color-primary);
  font-weight: 600;
}
.terms-content {
  flex: 1 1 auto;
  min-height: 120px;
  overflow-y: auto;
  padding: var(--spacing-5);
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  background-color: var(--color-white);
  line-height: 1.5;
  white-space: pre-line;
  overflow-wrap: anywhere;
}
.terms-error {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-4);
  border-radius: var(--round-lg);
  color: var(--color-wine);
  background-color: var(--color-wine-lighest);
}
.terms-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--spacing-3);
}
</style>
