<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onTermsNotAccepted } from '@/services/api'
import { useTermsStore } from '@/stores/terms-store'

const termsStore = useTermsStore()
const { status, pending, error } = storeToRefs(termsStore)

onMounted(() => {
  // New terms published while the user is in the app: the server starts refusing every call,
  // and the terms dialog comes back.
  onTermsNotAccepted(() => termsStore.load())
  termsStore.load()
})

onBeforeUnmount(() => onTermsNotAccepted(null))
</script>

<template>
  <!--
    Nothing opens before the terms status is known. While the current terms still have to be
    accepted, the layout stays behind the dialog, dimmed and inert, without the page itself: a page
    would load its data, get 403 terms_not_accepted and bring the dialog up again.
  -->
  <template v-if="status === 'done'">
    <div
      class="akpedia-page"
      :inert="pending || undefined"
      :aria-hidden="pending ? 'true' : undefined"
    >
      <AkSidebar />
      <div class="main-section">
        <AkHeader />
        <div class="main-content">
          <RouterView v-if="!pending" />
        </div>
      </div>
    </div>
    <AkTermsModal v-if="pending" />
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
