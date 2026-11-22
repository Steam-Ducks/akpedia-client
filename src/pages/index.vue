<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useResultStore } from '@/stores/result-store'
import { useChatStore } from '@/stores/chat-store'
import { sessionUser } from '@/services/auth'
import { formatGreetingDate } from '@/utils/date'

const userName = computed(() => sessionUser.value?.name.split(' ')[0] ?? '')
const empresaName = 'Akaer'
const today = formatGreetingDate(new Date())

type Mode = 'search' | 'chat'

const route = useRoute('/')
const router = useRouter()
const resultStore = useResultStore()
const chatStore = useChatStore()
const { query, categoryIds, results, recent, status, error } = storeToRefs(resultStore)

/** Parses `?categories=1,3` into category ids, dropping anything that is not a positive integer. */
function categoryIdsFromRoute(): number[] {
  const raw = route.query.categories
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) return []
  return value
    .split(',')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
}

function syncRouteWithCategories() {
  router.replace({
    query: { ...route.query, categories: categoryIds.value.join(',') || undefined },
  })
}

const mode = computed<Mode>({
  get: () => (route.query.mode === 'chat' ? 'chat' : 'search'),
  set: (value) => {
    router.replace({ query: { ...route.query, mode: value === 'chat' ? 'chat' : undefined } })
  },
})

const greetingHidden = computed(() => mode.value === 'chat' && chatStore.turns.length > 0)

watch(categoryIds, syncRouteWithCategories)

const searchbox = ref<{ $el: HTMLElement } | null>(null)

const BOX_MOVE_MS = 400
let boxMove: Animation | null = null

watch(
  mode,
  async () => {
    const box = searchbox.value?.$el
    if (!box) return
    const before = box.getBoundingClientRect().top
    await nextTick()
    boxMove?.cancel()
    const shift = before - box.getBoundingClientRect().top
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (shift === 0 || reduceMotion || typeof box.animate !== 'function') return
    boxMove = box.animate(
      [{ transform: `translateY(${shift}px)` }, { transform: 'translateY(0)' }],
      {
        duration: BOX_MOVE_MS,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    )
  },
  { flush: 'pre' },
)

watch(mode, (value) => {
  if (value === 'search' && status.value === 'idle') resultStore.loadRecent()
})

onMounted(async () => {
  if (mode.value === 'chat') return
  const idsFromRoute = categoryIdsFromRoute()
  if (idsFromRoute.length > 0) {
    categoryIds.value = idsFromRoute
    await resultStore.search(query.value, idsFromRoute)
  } else {
    resultStore.loadRecent()
  }
})
</script>

<template>
  <main class="ak-general" :class="{ chatting: mode === 'chat' }">
    <div
      class="salutation-wrapper"
      :class="{ hidden: greetingHidden }"
      :aria-hidden="greetingHidden"
    >
      <div class="salutation-content">
        <div class="salutation-date">{{ today }}</div>
        <div class="salutation-welcome text-title-large">
          Olá, {{ userName }}. <span class="text-highlight">O que você procura?</span>
        </div>
        <div class="salutation-description">
          Encontre documentos técnicos, normativas e informações de {{ empresaName }} em um só
          lugar.
        </div>
      </div>
    </div>
    <AkChatPanel v-if="mode === 'chat'" />
    <AkSearchbox ref="searchbox" v-model:mode="mode" with-mode-switch />
    <div v-if="mode === 'search'" class="result-section">
      <div class="result-list">
        <template v-if="status === 'idle' && recent.length > 0">
          <div class="text-muted">Documentos recentes</div>
          <AkResultCard v-for="item in recent" :key="item.documentData.id" :payload="item" />
        </template>
        <div v-else-if="status === 'loading'" class="text-muted">Buscando documentos…</div>
        <div v-else-if="status === 'error'" class="text-muted">{{ error }}</div>
        <div v-else-if="status === 'done' && results.length === 0" class="text-muted">
          Nenhum documento encontrado para essa busca.
        </div>
        <template v-else-if="status === 'done'">
          <div class="text-muted">
            {{ results.length }}
            {{ results.length === 1 ? 'documento encontrado' : 'documentos encontrados' }}
          </div>
          <AkResultCard v-for="item in results" :key="item.documentData.id" :payload="item" />
        </template>
      </div>
    </div>
  </main>
</template>

<style scoped>
.ak-general {
  min-height: 100%;
  padding: var(--spacing-10);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.ak-general.chatting {
  height: 100%;
}

.salutation-wrapper {
  display: grid;
  grid-template-rows: 1fr;
  transition:
    opacity 0.4s ease,
    grid-template-rows 0s,
    margin-bottom 0s;
}

.salutation-wrapper.hidden {
  grid-template-rows: 0fr;
  opacity: 0;
  margin-bottom: calc(-1 * var(--spacing-4));
  pointer-events: none;
  transition:
    opacity 0.4s ease,
    grid-template-rows 0s 0.4s,
    margin-bottom 0s 0.4s;
}

.salutation-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  min-height: 0;
  overflow: hidden;
}

@media (prefers-reduced-motion: reduce) {
  .salutation-wrapper,
  .salutation-wrapper.hidden {
    transition: none;
  }
}

.salutation-date {
  color: var(--color-text-muted);
  text-transform: uppercase;
  font-size: var(--font-md);
  font-weight: 600;
}
.salutation-description {
  color: var(--color-text-muted);
}
.result-section {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-4);
}

.result-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}
</style>
