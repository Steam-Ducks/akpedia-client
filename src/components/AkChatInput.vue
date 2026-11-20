<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useChatStore } from '@/stores/chat-store'
import { MAX_QUESTION_LENGTH } from '@/services/chat'

const chatStore = useChatStore()
const { draft, turns } = storeToRefs(chatStore)

const waiting = computed(() => turns.value.some((turn) => turn.status === 'loading'))
const canSend = computed(() => draft.value.trim() !== '' && !waiting.value)

const send = () => {
  if (!canSend.value) return
  chatStore.ask(draft.value)
}
</script>

<template>
  <form class="chat-input" @submit.prevent="send">
    <AkTextarea
      v-model="draft"
      :rows="2"
      :maxlength="MAX_QUESTION_LENGTH"
      placeholder="Faça uma pergunta sobre os documentos"
      @keydown.enter.exact.prevent="send"
    />
    <AkButton type="submit" :disabled="!canSend">Perguntar</AkButton>
  </form>
</template>

<style lang="css" scoped>
.chat-input {
  display: flex;
  align-items: flex-end;
  gap: var(--spacing-5);
}

.chat-input :deep(.ak-textarea) {
  flex: 1;
}
</style>
