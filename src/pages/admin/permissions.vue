<script setup lang="ts">
import { CircleAlert, CircleCheckBig, Info } from '@lucide/vue'
import { fetchSectorCategories, updateSectorCategories } from '@/services/sector-permissions'
import type { PermissionCategory, SectorCategories } from '@/types/SectorPermissions'

definePage({ meta: { roles: ['ADMIN'] } })

const categories = ref<PermissionCategory[]>([])
/** The sectors as saved on the server. */
const saved = ref<SectorCategories[]>([])
/** The categories ticked on screen, by sector id. */
const ticked = ref<Record<number, number[]>>({})

const status = ref<'loading' | 'done' | 'error'>('loading')
const loadError = ref<string | null>(null)

/** The sector being saved, so its button waits. */
const savingId = ref<number | null>(null)
const actionError = ref<string | null>(null)
const actionSuccess = ref<string | null>(null)

const sameIds = (a: number[], b: number[]) =>
  a.length === b.length && [...a].sort().every((id, i) => id === [...b].sort()[i])

const isDirty = (sector: SectorCategories) =>
  !sameIds(ticked.value[sector.id] ?? [], sector.categoryIds)

const isTicked = (sector: SectorCategories, category: PermissionCategory) =>
  (ticked.value[sector.id] ?? []).includes(category.id)

const toggle = (sector: SectorCategories, category: PermissionCategory) => {
  const current = ticked.value[sector.id] ?? []
  ticked.value[sector.id] = current.includes(category.id)
    ? current.filter((id) => id !== category.id)
    : [...current, category.id]
}

const load = async () => {
  status.value = 'loading'
  loadError.value = null
  try {
    const matrix = await fetchSectorCategories()
    categories.value = matrix.categories
    saved.value = matrix.sectors
    ticked.value = Object.fromEntries(matrix.sectors.map((s) => [s.id, [...s.categoryIds]]))
    status.value = 'done'
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Não foi possível carregar as permissões.'
    status.value = 'error'
  }
}

const discard = (sector: SectorCategories) => {
  ticked.value[sector.id] = [...sector.categoryIds]
}

const save = async (sector: SectorCategories) => {
  actionError.value = null
  actionSuccess.value = null
  savingId.value = sector.id
  try {
    const updated = await updateSectorCategories(sector.id, [...(ticked.value[sector.id] ?? [])])
    saved.value = saved.value.map((s) => (s.id === updated.id ? updated : s))
    ticked.value[updated.id] = [...updated.categoryIds]
    actionSuccess.value = `Permissões de ${updated.name} salvas. Valem a partir da próxima busca.`
  } catch (e) {
    actionError.value =
      e instanceof Error ? e.message : 'Não foi possível salvar as permissões do setor.'
  } finally {
    savingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <main class="ak-admin-permissions">
    <div class="admin-header">
      <div class="text-title-large">Permissões por setor</div>
      <div class="text-muted">
        Marque as categorias de documento que cada setor pode ver e salve a linha do setor.
      </div>
    </div>

    <div class="admin-feedback admin-feedback--info">
      <Info :size="19" />
      <span>As mudanças valem a partir da próxima busca de cada pessoa do setor.</span>
    </div>

    <div v-if="actionError" class="admin-feedback admin-feedback--error" role="alert">
      <CircleAlert :size="19" />
      <span>{{ actionError }}</span>
    </div>
    <div v-if="actionSuccess" class="admin-feedback admin-feedback--success" role="status">
      <CircleCheckBig :size="19" />
      <span>{{ actionSuccess }}</span>
    </div>

    <div v-if="status === 'loading'" class="text-muted">Carregando as permissões…</div>
    <div v-else-if="status === 'error'" class="admin-feedback admin-feedback--error">
      <CircleAlert :size="19" />
      <span>{{ loadError }}</span>
      <AkButton type="button" class="retry" @click="load">Tentar novamente</AkButton>
    </div>
    <div v-else-if="saved.length === 0" class="text-muted">Nenhum setor cadastrado.</div>

    <div v-else class="table-wrapper">
      <table class="permissions-table">
        <thead>
          <tr>
            <th scope="col">Setor</th>
            <th v-for="category in categories" :key="category.id" scope="col" class="cell-center">
              <span :title="category.description ?? ''">{{ category.name }}</span>
            </th>
            <th scope="col"><span class="visually-hidden">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="sector in saved"
            :key="sector.id"
            class="sector-row"
            :data-sector-id="sector.id"
            :class="{ dirty: isDirty(sector) }"
          >
            <th scope="row" class="text-bold">{{ sector.name }}</th>
            <td v-for="category in categories" :key="category.id" class="cell-center">
              <input
                type="checkbox"
                class="permission-toggle"
                :data-category-id="category.id"
                :checked="isTicked(sector, category)"
                :disabled="savingId === sector.id"
                :aria-label="`${sector.name} vê ${category.name}`"
                @change="toggle(sector, category)"
              />
            </td>
            <td>
              <div class="row-actions">
                <AkButton
                  type="button"
                  class="row-action discard-sector"
                  :disabled="!isDirty(sector) || savingId === sector.id"
                  @click="discard(sector)"
                >
                  Desfazer
                </AkButton>
                <AkButton
                  type="button"
                  color="primary"
                  class="row-action save-sector"
                  :disabled="!isDirty(sector) || savingId === sector.id"
                  @click="save(sector)"
                >
                  {{ savingId === sector.id ? 'Salvando…' : 'Salvar' }}
                </AkButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>

<style scoped>
.ak-admin-permissions {
  padding: var(--spacing-10);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}
.admin-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
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
.admin-feedback--success {
  color: var(--color-text);
  background-color: var(--color-background-hover);
}
.admin-feedback--info {
  color: var(--color-primary);
  background-color: var(--color-primary-selected);
}
.retry {
  margin-left: auto;
}
.table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  background-color: var(--color-white);
}
.permissions-table {
  width: 100%;
  border-collapse: collapse;
}
.permissions-table th,
.permissions-table td {
  padding: var(--spacing-3) var(--spacing-4);
  vertical-align: middle;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}
.permissions-table tbody tr:last-child th,
.permissions-table tbody tr:last-child td {
  border-bottom: none;
}
.permissions-table .cell-center {
  text-align: center;
}
.sector-row.dirty {
  background-color: var(--color-background-hover);
}
.permission-toggle {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
  cursor: pointer;
}
.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-2);
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
