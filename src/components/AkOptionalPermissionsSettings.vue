<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { useOptionalPermissionsStore } from '@/stores/optional-permissions-store'
import { formatDate } from '@/utils/date'

/** The user's optional permissions on their account page: each one turns on or off at any time. */
const store = useOptionalPermissionsStore()
const { permissions, status, error } = storeToRefs(store)
const savingId = ref<string | null>(null)
const saved = ref<string | null>(null)

const toggle = async (id: string, event: Event) => {
  const input = event.target as HTMLInputElement
  savingId.value = id
  saved.value = null
  try {
    await store.choose(id, input.checked)
    const p = permissions.value.find((entry) => entry.id === id)
    saved.value = `${p?.label}: ${input.checked ? 'permitido' : 'não permitido'}.`
  } catch {
    input.checked = !input.checked
  } finally {
    savingId.value = null
  }
}

onMounted(() => {
  if (status.value !== 'done') store.load()
})
</script>

<template>
  <section class="account-card optional-permissions">
    <div class="text-title-small">Permissões opcionais</div>
    <div class="text-muted">
      Fazem parte dos termos de uso, mas nada disso é obrigatório: recusar não limita o que você
      pode fazer no Akpedia. Quando os termos de uso mudam, você escolhe de novo ao aceitar a nova
      versão.
    </div>

    <div v-if="status === 'loading'" class="text-muted">Carregando…</div>
    <ul v-else-if="permissions.length" class="optional-list">
      <li v-for="p in permissions" :key="p.id" class="optional-item">
        <label class="optional-label">
          <input
            type="checkbox"
            :checked="p.granted"
            :disabled="savingId === p.id"
            @change="toggle(p.id, $event)"
          />
          <span>
            <strong>{{ p.label }}</strong>
            <span class="text-muted optional-description">{{ p.description }}</span>
            <span v-if="!p.decided" class="text-muted optional-meta">Ainda não decidido</span>
            <span v-else-if="p.decidedAt" class="text-muted optional-meta">
              Escolhido em {{ formatDate(p.decidedAt) }}
            </span>
          </span>
        </label>
      </li>
    </ul>
    <div v-else-if="status === 'done'" class="text-muted">
      Nenhuma permissão opcional no momento.
    </div>

    <div v-if="error" class="optional-error" role="alert">
      <CircleAlert :size="19" />
      <span>{{ error }}</span>
    </div>
    <div v-else-if="saved" class="text-muted" role="status">{{ saved }}</div>
  </section>
</template>

<style lang="css" scoped>
.optional-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}
.optional-label {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-3);
  cursor: pointer;
}
.optional-label input {
  margin-top: 3px;
}
.optional-description,
.optional-meta {
  display: block;
  margin-top: var(--spacing-1);
}
.optional-meta {
  font-size: var(--font-sm);
}
.optional-error {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-4);
  border-radius: var(--round-lg);
  color: var(--color-wine);
  background-color: var(--color-wine-lighest);
}
</style>
