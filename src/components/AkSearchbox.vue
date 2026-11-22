<script setup lang="ts">
import { ArrowUpRight, Search } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { useResultStore } from '@/stores/result-store'

type Mode = 'search' | 'chat'

type Props = {
  withModeSwitch?: boolean
  /** A single slim line, for narrow columns: no header and an icon-only submit button. */
  compact?: boolean
}

const props = defineProps<Props>()

const mode = defineModel<Mode>('mode', { default: 'search' })

const modeOptions: { value: Mode; label: string }[] = [
  { value: 'search', label: 'Busca' },
  { value: 'chat', label: 'Chat com IA' },
]

const resultStore = useResultStore()
const { query, categoryIds, categories, status } = storeToRefs(resultStore)

onMounted(() => {
  if (categories.value.length === 0) {
    resultStore.loadCategories()
  }
})

const chatMode = computed(() => props.withModeSwitch && mode.value === 'chat')

const canSubmit = computed(() => query.value.trim() !== '' || categoryIds.value.length > 0)

function submit() {
  if (!canSubmit.value) return
  resultStore.search(query.value, categoryIds.value)
}
</script>

<template>
  <div class="searchbox-wrapper" :class="{ compact, chat: chatMode }">
    <div v-if="!compact" class="searchbox-header">
      <span>Busca Inteligente</span>
      <AkSegmentedControl
        v-if="withModeSwitch"
        v-model="mode"
        :options="modeOptions"
        label="Modo"
        theme="dark"
      />
    </div>
    <AkChatInput v-if="chatMode" />
    <form v-else class="searchbox-form" @submit.prevent="submit">
      <div class="searchbox-search-line">
        <AkInput
          v-model="query"
          class="flex-1"
          type="search"
          :placeholder="compact ? 'Buscar documentos' : 'Busque por uma palavra, frase ou pergunta'"
        >
          <template #pre>
            <Search :size="compact ? 17 : 24" />
          </template>
        </AkInput>
        <AkButton
          type="submit"
          :icon="compact"
          :disabled="status === 'loading' || !canSubmit"
          :title="compact ? 'Buscar documentos' : undefined"
        >
          <template v-if="!compact">Buscar documentos</template>
          <ArrowUpRight :size="19" />
        </AkButton>
      </div>
      <AkAccordion v-if="compact && categories.length > 0" title="Categorias">
        <CategoryChips
          :categories="categories"
          :selected-ids="categoryIds"
          @toggle="resultStore.toggleCategory"
        />
      </AkAccordion>
      <CategoryChips
        v-else-if="categories.length > 0"
        :categories="categories"
        :selected-ids="categoryIds"
        @toggle="resultStore.toggleCategory"
      />
    </form>
  </div>
</template>

<style lang="css" scoped>
.flex-1 {
  flex: 1;
}
.searchbox-wrapper {
  position: relative;
  z-index: 0;
  overflow: hidden;
  width: 100%;
  padding: var(--spacing-5) var(--spacing-8) var(--spacing-8);
  background: var(--color-primary);
  color: var(--color-white);

  border-radius: var(--round-lg);

  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}
.searchbox-wrapper::after {
  top: 50%;
  left: 60%;
  position: absolute;
  content: '';
  width: 600px;
  aspect-ratio: 1;
  background-color: rgba(255, 255, 255, 0.06);
  z-index: -1;
  border-radius: 50%;
  pointer-events: none;

  transform: translate(0, -50%);
}
.searchbox-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  color: rgba(from var(--color-white) r g b / 0.85);
  text-transform: uppercase;
  font-weight: 600;
}
.searchbox-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}
.searchbox-search-line {
  position: relative;
  width: 100%;
  display: flex;
  gap: var(--spacing-5);
}
.searchbox-wrapper.chat {
  flex-shrink: 0;
}
.searchbox-wrapper.compact {
  padding: var(--spacing-2);
}
.searchbox-wrapper.compact::after {
  width: 200px;
}
.compact .searchbox-search-line {
  align-items: center;
  gap: var(--spacing-2);
}
.compact :deep(.ak-input) {
  padding: var(--spacing-2) var(--spacing-3);
  gap: var(--spacing-2);
  font-size: var(--font-md);
}
.compact :deep(.ak-accordion-header),
.compact :deep(.ak-accordion-content) {
  padding-left: var(--spacing-3);
  padding-right: var(--spacing-3);
}
</style>
