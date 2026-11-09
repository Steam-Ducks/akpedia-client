<script setup lang="ts">
import { CircleAlert, Trash2 } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import logoUrl from '@/assets/images/akpedia-logo.png'
import { useTermsStore } from '@/stores/terms-store'
import { formatDate } from '@/utils/date'

// The current terms of use, while they are pending: App.vue and the router send the user here
// before any other page, and back once they are accepted.

const termsStore = useTermsStore()
const { current, accepted, status, accepting, error } = storeToRefs(termsStore)

const card = ref<HTMLElement | null>(null)

/** Accepting takes ticking the box first: the user says they read the text. */
const agreed = ref(false)

// A newer version came in while this one was on screen: it has to be read and ticked again.
watch(
  () => current.value?.version,
  () => {
    agreed.value = false
  },
)

/**
 * Not accepting means leaving for good: the confirmation records the refusal, deletes the account
 * and logs out. Until then the terms stay on screen, inert behind it.
 */
const confirmingDeletion = ref(false)

const cancelDeletion = async () => {
  confirmingDeletion.value = false
  await nextTick()
  card.value?.focus()
}

onMounted(async () => {
  await termsStore.load()
  card.value?.focus()
})
</script>

<template>
  <main class="ak-accept-terms">
    <section
      v-if="current"
      ref="card"
      :inert="confirmingDeletion || undefined"
      :aria-hidden="confirmingDeletion ? 'true' : undefined"
      class="terms-card"
      aria-labelledby="terms-title"
      aria-describedby="terms-intro"
      tabindex="-1"
    >
      <div class="terms-header">
        <img :src="logoUrl" alt="Akpedia" class="terms-logo" />
        <h1 id="terms-title" class="text-title-large">{{ current.title }}</h1>
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

      <label class="terms-agree">
        <input v-model="agreed" type="checkbox" class="terms-agree-box" required />
        <span>Li e aceito os termos de uso da versão {{ current.version }}.</span>
      </label>

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
          :disabled="accepting || !agreed"
          :title="agreed ? '' : 'Marque que leu e aceita os termos para continuar.'"
          @click="termsStore.accept()"
        >
          {{ accepting ? 'Aceitando…' : 'Aceitar' }}
        </AkButton>
      </div>
    </section>

    <div v-else-if="status === 'error'" class="terms-message">
      <span class="text-muted">{{ error }}</span>
      <AkButton type="button" @click="termsStore.load()">Tentar novamente</AkButton>
    </div>
    <div v-else class="terms-message text-muted" role="status">Carregando os termos de uso…</div>

    <AkDeleteAccountDialog
      v-if="confirmingDeletion"
      :before-delete="termsStore.decline"
      @cancel="cancelDeletion"
    />
  </main>
</template>

<style lang="css" scoped>
.ak-accept-terms {
  height: 100%;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-5);
  background-color: var(--color-background);
}
.terms-card {
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
.terms-header h1 {
  margin: 0;
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
.terms-agree {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  cursor: pointer;
}
.terms-agree-box {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
  cursor: pointer;
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
.terms-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-4);
  text-align: center;
}
</style>
