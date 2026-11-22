<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import { fetchTermsAcceptances } from '@/services/terms'
import type { TermsAcceptanceEntry, TermsVersion } from '@/types/Terms'
import { formatDateTime } from '@/utils/date'

const props = defineProps<{ versions: TermsVersion[] }>()

const PAGE_SIZE = 20
const FILTER_DELAY_MS = 300

const version = ref('')
const user = ref('')

const entries = ref<TermsAcceptanceEntry[]>([])
const page = ref(0)
const totalPages = ref(0)
const status = ref<'loading' | 'done' | 'error'>('loading')
const loadError = ref<string | null>(null)

let latestRequest = 0

const load = async () => {
  const request = ++latestRequest
  status.value = 'loading'
  loadError.value = null
  try {
    const result = await fetchTermsAcceptances({
      version: version.value,
      user: user.value,
      page: page.value,
      size: PAGE_SIZE,
    })
    if (request !== latestRequest) return
    entries.value = result.content
    totalPages.value = result.totalPages
    status.value = 'done'
  } catch (e) {
    if (request !== latestRequest) return
    loadError.value = e instanceof Error ? e.message : 'Não foi possível carregar os aceites.'
    status.value = 'error'
  }
}

const changePage = (next: number) => {
  page.value = next
  load()
}

let filterTimer: ReturnType<typeof setTimeout> | undefined
watch([version, user], () => {
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => {
    page.value = 0
    load()
  }, FILTER_DELAY_MS)
})

watch(
  () => props.versions.length,
  () => {
    clearTimeout(filterTimer)
    page.value = 0
    load()
  },
)

onMounted(load)
onBeforeUnmount(() => clearTimeout(filterTimer))
</script>

<template>
  <section class="admin-card acceptances">
    <div class="text-title-small">Quem aceitou</div>

    <form class="acceptance-filters" @submit.prevent>
      <label class="form-field">
        <span class="text-label-small">Versão</span>
        <AkSelect v-model="version" class="filter-version">
          <option value="">Todas</option>
          <option v-for="entry in versions" :key="entry.version" :value="entry.version">
            {{ entry.version }}
          </option>
        </AkSelect>
      </label>
      <label class="form-field form-field--wide">
        <span class="text-label-small">Funcionário</span>
        <AkInput v-model="user" class="filter-user" placeholder="Parte do nome ou do e-mail" />
      </label>
    </form>

    <div v-if="status === 'loading' && entries.length === 0" class="text-muted">
      Carregando os aceites…
    </div>
    <div v-else-if="status === 'error'" class="admin-feedback admin-feedback--error">
      <CircleAlert :size="19" />
      <span>{{ loadError }}</span>
    </div>
    <div v-else-if="entries.length === 0" class="text-muted acceptances-empty">
      Nenhum aceite com esses filtros.
    </div>

    <template v-else>
      <div class="table-wrapper">
        <table class="acceptance-table">
          <thead>
            <tr>
              <th scope="col">Funcionário</th>
              <th scope="col">E-mail</th>
              <th scope="col">Versão</th>
              <th scope="col">Aceito em</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in entries" :key="entry.id" class="acceptance-row">
              <td class="text-bold">{{ entry.userName ?? '—' }}</td>
              <td>{{ entry.userEmail ?? '—' }}</td>
              <td>{{ entry.version }}</td>
              <td class="nowrap">{{ formatDateTime(entry.acceptedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <AkPaginator :page="page" :total-pages="totalPages" @change="changePage" />
    </template>
  </section>
</template>

<style scoped>
.admin-card {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  background-color: var(--color-white);
  padding: var(--spacing-8);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}
.acceptance-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--spacing-4);
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  min-width: 160px;
}
.form-field--wide {
  min-width: 240px;
}
.admin-feedback {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-4);
  border-radius: var(--round-lg);
}
.admin-feedback--error {
  color: var(--color-wine);
  background-color: var(--color-wine-lighest);
}
.table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
}
.acceptance-table {
  width: 100%;
  border-collapse: collapse;
}
.acceptance-table th,
.acceptance-table td {
  padding: var(--spacing-3) var(--spacing-4);
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}
.acceptance-table tbody tr:last-child td {
  border-bottom: none;
}
.nowrap {
  white-space: nowrap;
}
</style>
