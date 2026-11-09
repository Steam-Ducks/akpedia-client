<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onCpfRefused, onTermsPending } from '@/services/api'
import { useCpfStore } from '@/stores/cpf-store'
import { useTermsStore } from '@/stores/terms-store'

const termsStore = useTermsStore()
const { status, pending, error } = storeToRefs(termsStore)
const cpfStore = useCpfStore()
const { problem: cpfProblem } = storeToRefs(cpfStore)

/** The app waits behind a dialog: terms to accept first, then a CPF the server refuses. */
const blocked = computed(() => pending.value || cpfProblem.value !== null)

onMounted(() => {
  // New terms published while the user is in the app: the server starts refusing every call,
  // and the terms dialog comes back.
  onTermsPending(() => termsStore.load())
  // A CPF the server refuses (invalid, or another user's): the CPF dialog comes up.
  onCpfRefused((code) => cpfStore.refused(code))
  termsStore.load()
  cpfStore.check()
})

onBeforeUnmount(() => {
  onTermsPending(null)
  onCpfRefused(null)
})
</script>

<template>
  <!--
    Nothing opens before the terms status is known. While the current terms still have to be
    accepted, the layout stays behind the dialog, dimmed and inert, without the page itself: a page
    would load its data, get 403 terms_pending and bring the dialog up again. The same while
    the server refuses the user's CPF (422 invalid_cpf or cpf_taken), behind the CPF dialog.
  -->
  <template v-if="status === 'done'">
    <div
      class="akpedia-page"
      :inert="blocked || undefined"
      :aria-hidden="blocked ? 'true' : undefined"
    >
      <AkSidebar />
      <div class="main-section">
        <AkHeader />
        <div class="main-content">
          <RouterView v-if="!blocked" />
        </div>
      </div>
    </div>
    <AkTermsModal v-if="pending" />
    <AkCpfProblemModal v-else-if="cpfProblem" />
  </template>
  <div v-else-if="status === 'error'" class="app-message">
    <span class="text-muted">{{ error }}</span>
    <AkButton type="button" @click="termsStore.load()">Tentar novamente</AkButton>
  </div>
</template>

<style lang="css" scoped>
.akpedia-page {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
}
.main-section {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.main-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.app-message {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-4);
  padding: var(--spacing-10);
  text-align: center;
}
</style>
