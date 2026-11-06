<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onTermsNotAccepted } from '@/services/api'
import { useTermsStore } from '@/stores/terms-store'

const termsStore = useTermsStore()
const { status, pending, error } = storeToRefs(termsStore)

onMounted(() => {
  // New terms published while the user is in the app: the server starts refusing every call,
  // and the terms screen comes back.
  onTermsNotAccepted(() => termsStore.load())
  termsStore.load()
})

onBeforeUnmount(() => onTermsNotAccepted(null))
</script>

<template>
  <!-- The app opens only once the current terms of use are accepted. -->
  <AkTermsScreen v-if="pending" />
  <div v-else-if="status === 'done'" class="akpedia-page">
    <AkSidebar />
    <div class="main-section">
      <AkHeader />
      <div class="main-content">
        <RouterView />
      </div>
    </div>
  </div>
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
