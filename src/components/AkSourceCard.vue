<script setup lang="ts">
import { ArrowUpRight } from '@lucide/vue'
import { formatUpdatedAgo } from '@/utils/date'
import type { ChatSourceDetails } from '@/types/Chat'

type Props = {
  source: ChatSourceDetails
}

const props = defineProps<Props>()

const router = useRouter()

const updatedAgo = computed(() =>
  props.source.updated_at ? formatUpdatedAgo(new Date(props.source.updated_at)) : null,
)

const open = () => router.push(`/docs/${props.source.document_id}`)
</script>

<template>
  <button type="button" class="source-card" :title="source.name" @click="open">
    <span class="source-header">
      <span class="source-badge">{{ source.category }}</span>
      <ArrowUpRight class="source-arrow" :size="19" />
    </span>
    <span class="text-title-small source-title">{{ source.name }}</span>
    <span v-if="source.description" class="text-muted source-description">{{
      source.description
    }}</span>
    <span v-if="source.responsible_name || updatedAgo" class="source-footer">
      <span v-if="source.responsible_name" class="text-muted">{{ source.responsible_name }}</span>
      <span v-if="updatedAgo" class="text-muted">{{ updatedAgo }}</span>
    </span>
  </button>
</template>

<style lang="css" scoped>
.source-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  min-width: 0;
  height: 14rem;
  padding: var(--spacing-4);
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  box-shadow: var(--elevation-1);
  background-color: var(--color-white);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.source-card:hover {
  border-color: var(--color-primary-muted);
  box-shadow: var(--elevation-2);
}

.source-card:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.source-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-2);
}

.source-badge {
  display: inline-block;
  font-size: var(--font-sm);
  font-weight: 700;
  color: var(--color-primary);
  background-color: var(--color-primary-selected);
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--round-lg);
}

.source-arrow {
  flex-shrink: 0;
  color: var(--color-primary);
}

.source-title {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.source-description {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.source-footer {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1) var(--spacing-5);
  margin-top: auto;
  font-size: var(--font-sm);
  font-weight: 600;
}
</style>
