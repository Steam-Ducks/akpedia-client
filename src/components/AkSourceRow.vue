<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import type { ChatSourceDetails } from '@/types/Chat'

type Props = {
  sources: ChatSourceDetails[]
}

defineProps<Props>()

const track = ref<HTMLElement | null>(null)
const canScroll = ref(false)

const updateCanScroll = () => {
  const element = track.value
  canScroll.value = !!element && element.scrollWidth > element.clientWidth + 1
}

const scrollBy = (direction: 1 | -1) => {
  const element = track.value
  if (!element) return
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  element.scrollBy?.({
    left: direction * element.clientWidth * 0.8,
    behavior: reduceMotion ? 'auto' : 'smooth',
  })
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  updateCanScroll()
  if (track.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(updateCanScroll)
    resizeObserver.observe(track.value)
  }
})

onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <div class="source-row">
    <button
      type="button"
      class="row-arrow previous"
      :class="{ inactive: !canScroll }"
      :tabindex="canScroll ? 0 : -1"
      :aria-hidden="!canScroll"
      aria-label="Fontes anteriores"
      @click="scrollBy(-1)"
    >
      <ChevronLeft :size="19" />
    </button>
    <div ref="track" class="row-track">
      <AkSourceCard
        v-for="source in sources"
        :key="source.document_id"
        class="row-item"
        :source="source"
      />
    </div>
    <button
      type="button"
      class="row-arrow next"
      :class="{ inactive: !canScroll }"
      :tabindex="canScroll ? 0 : -1"
      :aria-hidden="!canScroll"
      aria-label="Próximas fontes"
      @click="scrollBy(1)"
    >
      <ChevronRight :size="19" />
    </button>
  </div>
</template>

<style lang="css" scoped>
/* The arrows float over the track's edges instead of taking room beside it, so the cards line up
   with whatever is above them (the answer's text). */
.source-row {
  position: relative;
  display: flex;
  align-items: center;
  align-self: stretch;
  min-width: 0;
}

.row-track {
  display: flex;
  flex: 1;
  gap: var(--spacing-3);
  min-width: 0;
  padding: var(--spacing-1) 0;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.row-track::-webkit-scrollbar {
  display: none;
}

.row-item {
  flex: 0 0 max(15rem, calc((100% - 2 * var(--spacing-3)) / 3));
  scroll-snap-align: start;
}

.row-arrow {
  position: absolute;
  z-index: 1;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2rem;
  aspect-ratio: 1;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background-color: var(--color-white);
  box-shadow: 0 2px 6px 0 rgb(from var(--color-black) r g b / 0.14);
  color: var(--color-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.row-arrow.previous {
  left: calc(-1 * var(--spacing-3));
}

.row-arrow.next {
  right: calc(-1 * var(--spacing-3));
}

.row-arrow.inactive {
  visibility: hidden;
}

.row-arrow:hover {
  border-color: var(--color-primary-muted);
  background-color: var(--color-primary-selected);
}
</style>
