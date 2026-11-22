<script setup lang="ts">
import { Calendar, ChevronLeft, ChevronRight } from '@lucide/vue'

/* The browser's own calendar (input type="date") takes no CSS, so this one is drawn here. The
   value stays the input's format, "YYYY-MM-DD", or '' for no date. */

type Props = {
  /** Earliest date that can be picked, "YYYY-MM-DD". */
  min?: string
  /** Latest date that can be picked, "YYYY-MM-DD". */
  max?: string
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), { min: '', max: '', placeholder: 'dd/mm/aaaa' })

const model = defineModel<string>({ default: '' })

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const WEEKDAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

const pad = (n: number) => String(n).padStart(2, '0')
const toIso = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const fromIso = (value: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null
}
const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
const addMonths = (date: Date, months: number) => {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay))
}

const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const grid = ref<HTMLElement | null>(null)

const open = ref(false)
/** The day the keyboard is on; the month shown is this day's month. */
const focused = ref(new Date())

const selected = computed(() => fromIso(model.value))
const todayIso = () => toIso(new Date())

const display = computed(() => selected.value?.toLocaleDateString('pt-BR') ?? '')
const monthTitle = computed(() =>
  focused.value.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
)

const isDisabled = (iso: string) =>
  (props.min !== '' && iso < props.min) || (props.max !== '' && iso > props.max)

/** Six full weeks from the Sunday on or before the 1st, so the grid never changes height. */
const days = computed(() => {
  const first = new Date(focused.value.getFullYear(), focused.value.getMonth(), 1)
  const start = addDays(first, -first.getDay())
  const today = todayIso()
  const focusedIso = toIso(focused.value)
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index)
    const iso = toIso(date)
    return {
      iso,
      day: date.getDate(),
      label: `${WEEKDAY_NAMES[date.getDay()]}, ${date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      outside: date.getMonth() !== first.getMonth(),
      today: iso === today,
      selected: iso === model.value,
      focused: iso === focusedIso,
      disabled: isDisabled(iso),
    }
  })
})

const focusDay = async () => {
  await nextTick()
  grid.value?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus()
}

const show = () => {
  focused.value = selected.value ?? fromIso(props.max) ?? new Date()
  if (!selected.value && props.min && toIso(focused.value) < props.min)
    focused.value = fromIso(props.min)!
  open.value = true
  focusDay()
}

const close = (refocus = true) => {
  open.value = false
  if (refocus) trigger.value?.focus()
}

const pick = (iso: string) => {
  if (isDisabled(iso)) return
  model.value = iso
  close()
}

const clear = () => {
  model.value = ''
  close()
}

const moveMonth = (months: number) => {
  focused.value = addMonths(focused.value, months)
}

const KEY_STEPS: Record<string, (date: Date) => Date> = {
  ArrowLeft: (date) => addDays(date, -1),
  ArrowRight: (date) => addDays(date, 1),
  ArrowUp: (date) => addDays(date, -7),
  ArrowDown: (date) => addDays(date, 7),
  Home: (date) => addDays(date, -date.getDay()),
  End: (date) => addDays(date, 6 - date.getDay()),
  PageUp: (date) => addMonths(date, -1),
  PageDown: (date) => addMonths(date, 1),
}

const onGridKeydown = (event: KeyboardEvent) => {
  const step = KEY_STEPS[event.key]
  if (!step) return
  event.preventDefault()
  focused.value = step(focused.value)
  focusDay()
}

const onDocumentPointerDown = (event: PointerEvent) => {
  if (!root.value?.contains(event.target as Node)) close(false)
}

watch(open, (value) => {
  if (value) document.addEventListener('pointerdown', onDocumentPointerDown)
  else document.removeEventListener('pointerdown', onDocumentPointerDown)
})

onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown))
</script>

<template>
  <div ref="root" class="ak-date-picker" @keydown.esc.stop="open && close()">
    <button
      ref="trigger"
      type="button"
      class="ak-date-trigger"
      aria-haspopup="dialog"
      :aria-expanded="open"
      @click="open ? close() : show()"
    >
      <span v-if="display" class="ak-date-value">{{ display }}</span>
      <span v-else class="ak-date-placeholder">{{ placeholder }}</span>
      <Calendar class="ak-date-icon" :size="19" aria-hidden="true" />
    </button>

    <!-- Inside a <label>, a click on the card's blank parts would click the trigger and close
         it; cancelling the click stops that, and its buttons have no default to lose. -->
    <div
      v-if="open"
      class="ak-date-popover"
      role="dialog"
      aria-label="Escolher data"
      @click.prevent
    >
      <div class="ak-date-header">
        <button
          type="button"
          class="ak-date-nav previous"
          aria-label="Mês anterior"
          @click="moveMonth(-1)"
        >
          <ChevronLeft :size="18" aria-hidden="true" />
        </button>
        <span class="ak-date-month" aria-live="polite">{{ monthTitle }}</span>
        <button
          type="button"
          class="ak-date-nav next"
          aria-label="Próximo mês"
          @click="moveMonth(1)"
        >
          <ChevronRight :size="18" aria-hidden="true" />
        </button>
      </div>

      <div class="ak-date-weekdays" aria-hidden="true">
        <span v-for="(weekday, index) in WEEKDAYS" :key="index">{{ weekday }}</span>
      </div>

      <div ref="grid" class="ak-date-grid" @keydown="onGridKeydown">
        <button
          v-for="day in days"
          :key="day.iso"
          type="button"
          class="ak-date-day"
          :class="{
            outside: day.outside,
            today: day.today,
            selected: day.selected,
          }"
          :data-date="day.iso"
          :tabindex="day.focused ? 0 : -1"
          :disabled="day.disabled"
          :aria-label="day.label"
          :aria-pressed="day.selected"
          :aria-current="day.today ? 'date' : undefined"
          @click="pick(day.iso)"
        >
          {{ day.day }}
        </button>
      </div>

      <div class="ak-date-footer">
        <button type="button" class="ak-date-action clear" @click="clear">Limpar</button>
        <button
          type="button"
          class="ak-date-action today-action"
          :disabled="isDisabled(todayIso())"
          @click="pick(todayIso())"
        >
          Hoje
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="css" scoped>
.ak-date-picker {
  position: relative;
}

.ak-date-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  width: 100%;
  padding: var(--spacing-4);
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  background-color: var(--color-input-background);
  color: var(--color-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.ak-date-trigger:focus-visible,
.ak-date-trigger[aria-expanded='true'] {
  outline: none;
  border-color: var(--color-primary);
}

.ak-date-placeholder,
.ak-date-icon {
  color: var(--color-text-muted);
}

.ak-date-icon {
  flex-shrink: 0;
}

.ak-date-popover {
  position: absolute;
  top: calc(100% + var(--spacing-1));
  left: 0;
  z-index: 20;
  width: 18rem;
  padding: var(--spacing-3);
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  background-color: var(--color-input-background);
  color: var(--color-text);
  box-shadow: 0 4px 12px 0 rgb(from var(--color-black) r g b / 0.14);
}

.ak-date-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-2);
}

.ak-date-month {
  font-weight: 700;
  text-transform: capitalize;
}

.ak-date-nav {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--round-md);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
}

.ak-date-weekdays,
.ak-date-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.ak-date-weekdays span {
  padding: var(--spacing-1) 0;
  color: var(--color-text-muted);
  font-size: var(--font-sm);
  font-weight: 700;
  text-align: center;
}

.ak-date-day {
  aspect-ratio: 1;
  border: 1px solid transparent;
  border-radius: var(--round-md);
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-md);
  cursor: pointer;
}

.ak-date-day.outside {
  color: var(--color-text-muted);
}

.ak-date-day.today {
  border-color: var(--color-primary);
  color: var(--color-primary);
  font-weight: 700;
}

.ak-date-nav:hover,
.ak-date-day:hover:not(:disabled) {
  background-color: var(--color-background-hover);
}

.ak-date-day.selected,
.ak-date-day.selected:hover {
  border-color: var(--color-primary);
  background-color: var(--color-primary);
  color: var(--color-white);
  font-weight: 700;
}

.ak-date-day:disabled {
  cursor: default;
  opacity: 0.35;
}

.ak-date-nav:focus-visible,
.ak-date-day:focus-visible,
.ak-date-action:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.ak-date-footer {
  display: flex;
  justify-content: space-between;
  margin-top: var(--spacing-2);
  padding-top: var(--spacing-2);
  border-top: 1px solid var(--color-border);
}

.ak-date-action {
  padding: var(--spacing-1) var(--spacing-2);
  border-radius: var(--round-md);
  background: transparent;
  color: var(--color-primary);
  font-size: var(--font-sm);
  font-weight: 700;
  cursor: pointer;
}

.ak-date-action:hover:not(:disabled) {
  background-color: var(--color-primary-selected);
}

.ak-date-action:disabled {
  cursor: default;
  opacity: 0.5;
}

@media (prefers-reduced-motion: no-preference) {
  .ak-date-popover {
    animation: ak-date-in 0.12s ease;
  }
}

@keyframes ak-date-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}
</style>
