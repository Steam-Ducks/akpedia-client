<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useChatStore } from '@/stores/chat-store'
import { stripPassageMarkers } from '@/services/chat'

const chatStore = useChatStore()
const { turns } = storeToRefs(chatStore)

const turnElements = ref<HTMLElement[]>([])

const scrollTurnIntoView = (element: HTMLElement | undefined, block: 'end' | 'nearest') => {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  element?.scrollIntoView?.({ block, behavior: reduceMotion ? 'auto' : 'smooth' })
}

watch(
  () => [turns.value.length, turns.value.at(-1)?.status],
  () => scrollTurnIntoView(turnElements.value.at(-1), 'end'),
  { flush: 'post' },
)
</script>

<template>
  <section class="chat-panel">
    <div v-for="(turn, index) in turns" :key="turn.id" ref="turnElements" class="chat-turn">
      <div class="chat-question">{{ turn.question }}</div>
      <div
        class="chat-answer"
        :class="{
          wide: turn.answer?.found && turn.answer.sources.length > 0,
          plain: turn.status === 'loading',
        }"
      >
        <div v-if="turn.status === 'loading'" class="text-muted loading" role="status">
          Procurando a resposta<span class="loading-dots" aria-hidden="true"></span>
        </div>
        <template v-else-if="turn.status === 'error'">
          <div class="text-muted">{{ turn.error }}</div>
          <AkButton type="button" @click="chatStore.retry(turn.id)">Tentar novamente</AkButton>
        </template>
        <div v-else-if="turn.answer && !turn.answer.found" class="text-muted">
          Não encontrei nada nos documentos que responda a essa pergunta.
        </div>
        <template v-else-if="turn.answer">
          <div class="chat-answer-text">{{ stripPassageMarkers(turn.answer.answer) }}</div>
          <AkSourceCarousel
            v-if="turn.answer.sources.length > 0"
            :sources="chatStore.withDetails(turn.answer.sources)"
            @toggle="scrollTurnIntoView(turnElements[index], 'nearest')"
          />
        </template>
      </div>
    </div>
  </section>
</template>

<style lang="css" scoped>
.chat-panel {
  --chat-bubble-shadow: 0 2px 6px 0 rgb(from var(--color-black) r g b / 0.14);
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: var(--spacing-6);
  min-height: 0;
  margin-right: calc(-1 * var(--spacing-10));
  margin-left: calc(-1 * var(--spacing-2));
  padding: var(--spacing-2) var(--spacing-10) var(--spacing-3) var(--spacing-2);
  scroll-padding-bottom: var(--spacing-3);
  overflow-y: auto;
  animation: chat-panel-in 0.4s ease;
}

@keyframes chat-panel-in {
  from {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chat-panel {
    animation: none;
  }
}

.chat-turn:first-child {
  margin-top: auto;
}

.chat-turn {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.chat-question {
  align-self: flex-end;
  max-width: 80%;
  padding: var(--spacing-3) var(--spacing-5);
  border-radius: var(--round-lg) var(--round-lg) 0 var(--round-lg);
  background-color: var(--color-primary);
  box-shadow: var(--chat-bubble-shadow);
  color: var(--color-white);
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.chat-answer {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  align-self: flex-start;
  gap: var(--spacing-4);
  max-width: 80%;
  padding: var(--spacing-4) var(--spacing-5);
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg) var(--round-lg) var(--round-lg) 0;
  background-color: var(--color-white);
  box-shadow: var(--chat-bubble-shadow);
}
.chat-answer.wide {
  align-self: stretch;
  max-width: 100%;
}

.chat-answer.wide,
.chat-answer.plain {
  padding: 0;
  border: none;
  border-radius: 0;
  background-color: transparent;
  box-shadow: none;
}

.loading-dots::after {
  content: '.';
  display: inline-block;
  width: 1.5em;
  text-align: left;
  animation: loading-dots 1.2s steps(1, end) infinite;
}

@keyframes loading-dots {
  0% {
    content: '.';
  }
  33% {
    content: '..';
  }
  66% {
    content: '...';
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-dots::after {
    content: '...';
    animation: none;
  }
}

.chat-answer-text {
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
</style>
