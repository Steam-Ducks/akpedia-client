<script setup lang="ts">
import { CircleAlert, CircleCheckBig } from '@lucide/vue'
import { fetchTermsVersions, publishTerms } from '@/services/terms'
import { useTermsStore } from '@/stores/terms-store'
import type { TermsVersion } from '@/types/Terms'
import { formatDate } from '@/utils/date'

const CONFIRM_MESSAGE =
  'Publicar estes termos como nova versão? Todos os usuários, você incluído, terão que aceitá-los novamente.'

const termsStore = useTermsStore()

const versions = ref<TermsVersion[]>([])
const status = ref<'loading' | 'done' | 'error'>('loading')
const loadError = ref<string | null>(null)

const title = ref('Termos de uso')
const content = ref('')
const publishing = ref(false)
const publishError = ref<string | null>(null)
const published = ref<number | null>(null)

const nextVersion = computed(() => (versions.value[0]?.version ?? 0) + 1)
const canPublish = computed(
  () => title.value.trim() !== '' && content.value.trim() !== '' && !publishing.value,
)

/** The form starts from the current version, so an admin edits it instead of rewriting it. */
const fillForm = (latest: TermsVersion | undefined) => {
  if (!latest) return
  title.value = latest.title
  content.value = latest.content
}

const load = async () => {
  status.value = 'loading'
  loadError.value = null
  try {
    versions.value = await fetchTermsVersions()
    fillForm(versions.value[0])
    status.value = 'done'
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Não foi possível carregar os termos.'
    status.value = 'error'
  }
}

const publish = async () => {
  if (!canPublish.value || !window.confirm(CONFIRM_MESSAGE)) return
  publishing.value = true
  publishError.value = null
  published.value = null

  try {
    const entry = await publishTerms({ title: title.value.trim(), content: content.value })
    versions.value = [entry, ...versions.value]
    published.value = entry.version
    // The admin has not accepted the new version either, so this brings up the terms screen.
    await termsStore.load()
  } catch (e) {
    publishError.value = e instanceof Error ? e.message : 'Não foi possível publicar os termos.'
  } finally {
    publishing.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="ak-admin-terms">
    <div class="admin-header">
      <div class="text-title-large">Termos de uso</div>
      <div class="text-muted">
        Cada publicação vira uma nova versão. Todos os usuários precisam aceitar a versão atual
        antes de usar o Akpedia; as versões anteriores ficam guardadas como foram publicadas.
      </div>
    </div>

    <div v-if="status === 'loading'" class="text-muted">Carregando os termos…</div>
    <div v-else-if="status === 'error'" class="admin-feedback admin-feedback--error">
      <CircleAlert :size="19" />
      <span>{{ loadError }}</span>
    </div>

    <template v-else>
      <form class="admin-card" @submit.prevent="publish">
        <div class="text-title-small">
          {{ versions.length ? 'Publicar nova versão' : 'Publicar a primeira versão' }}
        </div>

        <label class="form-field">
          <span class="text-label-small">Título</span>
          <AkInput v-model="title" placeholder="Termos de uso" />
        </label>

        <label class="form-field">
          <span class="text-label-small">Texto</span>
          <AkTextarea
            v-model="content"
            :rows="14"
            placeholder="Texto dos termos. Deixe uma linha em branco entre os parágrafos."
          />
        </label>

        <div v-if="publishError" class="admin-feedback admin-feedback--error">
          <CircleAlert :size="19" />
          <span>{{ publishError }}</span>
        </div>
        <div v-if="published !== null" class="admin-feedback admin-feedback--success">
          <CircleCheckBig :size="19" />
          <span>Versão {{ published }} publicada.</span>
        </div>

        <div class="form-actions">
          <AkButton type="submit" color="primary" :disabled="!canPublish">
            {{ publishing ? 'Publicando…' : `Publicar como versão ${nextVersion}` }}
          </AkButton>
        </div>
      </form>

      <section class="admin-versions">
        <div class="text-title-small">Versões publicadas</div>
        <div v-if="versions.length === 0" class="text-muted versions-empty">
          Nenhuma versão publicada ainda, então ninguém precisa aceitar termos para usar o Akpedia.
          A primeira versão publicada passa a valer para todos.
        </div>
        <div v-for="version in versions" v-else :key="version.version" class="version-item">
          <AkAccordion :title="`Versão ${version.version} — ${version.title}`">
            <div class="text-muted version-meta">
              Publicada em {{ formatDate(version.publishedAt) }}
              <template v-if="version.publishedBy"> por {{ version.publishedBy }}</template>
            </div>
            <div class="version-content">{{ version.content }}</div>
          </AkAccordion>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.ak-admin-terms {
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
.admin-card {
  max-width: 820px;
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  background-color: var(--color-white);
  padding: var(--spacing-8);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}
.form-actions {
  display: flex;
  justify-content: flex-end;
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
.admin-versions {
  max-width: 820px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}
.version-item {
  padding: var(--spacing-4) var(--spacing-5);
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  background-color: var(--color-white);
}
.version-meta {
  margin-bottom: var(--spacing-3);
}
.version-content {
  white-space: pre-line;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
</style>
