<script setup lang="ts">
import { CircleAlert, LogOut } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import logoUrl from '@/assets/images/akpedia-logo.png'
import { logout } from '@/services/auth'
import { useTermsStore } from '@/stores/terms-store'
import { formatDate } from '@/utils/date'

const termsStore = useTermsStore()
const { current, accepted, accepting, error } = storeToRefs(termsStore)
</script>

<template>
  <main v-if="current" class="ak-terms-screen">
    <div class="terms-card">
      <img :src="logoUrl" alt="Akpedia" class="terms-logo" />

      <div class="terms-header">
        <div class="text-title-large">{{ current.title }}</div>
        <div class="text-muted">
          Versão {{ current.version }}, publicada em {{ formatDate(current.publishedAt) }}
        </div>
        <div class="text-muted">Para usar o Akpedia, leia e aceite os termos abaixo.</div>
      </div>

      <div v-if="accepted" class="terms-notice">
        Você aceitou a versão {{ accepted.version }}; os termos mudaram.
      </div>

      <div class="terms-content" tabindex="0">{{ current.content }}</div>

      <div v-if="error" class="terms-error">
        <CircleAlert :size="19" />
        <span>{{ error }}</span>
      </div>

      <div class="terms-actions">
        <AkButton type="button" class="terms-decline" @click="logout()">
          <LogOut :size="19" />
          Recusar e sair
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
  </main>
</template>

<style lang="css" scoped>
.ak-terms-screen {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: var(--spacing-10) var(--spacing-5);
}
.terms-card {
  width: 100%;
  max-width: 720px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
  padding: var(--spacing-10);
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  background-color: var(--color-foreground);
  box-shadow: var(--elevation-1);
}
.terms-logo {
  display: block;
  width: 100%;
  max-width: 160px;
  height: auto;
}
.terms-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}
.terms-notice {
  padding: var(--spacing-4);
  border-radius: var(--round-lg);
  background-color: var(--color-primary-selected);
  color: var(--color-primary);
  font-weight: 600;
}
.terms-content {
  max-height: 50vh;
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
