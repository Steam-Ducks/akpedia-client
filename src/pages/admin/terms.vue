<script setup lang="ts">
import { CircleAlert, CircleCheckBig } from '@lucide/vue'
import {
  fetchTermsVersions,
  publishTerms,
  sameTermsVersion,
  TERMS_VERSION_PATTERN,
  TermsVersionExistsError,
} from '@/services/terms'
import { useTermsStore } from '@/stores/terms-store'
import type { TermsVersion } from '@/types/Terms'
import { confirmAction } from '@/utils/confirm'
import { formatDate } from '@/utils/date'

definePage({ meta: { roles: ['ADMIN'] } })

const CONFIRM_MESSAGE =
  'Todos os usuários, você incluído, terão que aceitar esta nova versão dos termos novamente.'

const termsStore = useTermsStore()

const versions = ref<TermsVersion[]>([])
const status = ref<'loading' | 'done' | 'error'>('loading')
const loadError = ref<string | null>(null)

const version = ref('')
const title = ref('Termos de uso')
const content = ref('')
const publishing = ref(false)
const publishError = ref<string | null>(null)
/** The server's `terms_version_exists`, shown under the field until the version is changed. */
const versionTaken = ref<string | null>(null)
const published = ref<string | null>(null)

const typedVersion = computed(() => version.value.trim())

/** The newest published is the current one; versions are labels, never compared to find it. */
const currentVersion = computed(() => versions.value[0]?.version ?? null)

const versionHint = computed(() =>
  currentVersion.value === null
    ? 'Primeira versão: por exemplo 1.0.'
    : `A versão atual é ${currentVersion.value}. Use um número novo.`,
)

/** What is wrong with the typed version, if anything; nothing is said while it is empty. */
const versionError = computed(() => {
  if (typedVersion.value === '') return null
  if (!TERMS_VERSION_PATTERN.test(typedVersion.value)) {
    return 'Use até 20 caracteres: letras, números, ponto, hífen ou sublinhado.'
  }
  const repeated = versions.value.find((entry) =>
    sameTermsVersion(entry.version, typedVersion.value),
  )
  if (repeated) return `Já existe a versão ${repeated.version}. Use um número de versão novo.`
  return versionTaken.value
})

watch(version, () => {
  versionTaken.value = null
})

const canPublish = computed(
  () =>
    typedVersion.value !== '' &&
    versionError.value === null &&
    title.value.trim() !== '' &&
    content.value.trim() !== '' &&
    !publishing.value,
)

const publishLabel = computed(() => {
  if (publishing.value) return 'Publicando…'
  return typedVersion.value === '' ? 'Publicar versão' : `Publicar versão ${typedVersion.value}`
})

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
  if (!canPublish.value) return
  const confirmed = await confirmAction({
    title: `Publicar a versão ${typedVersion.value}?`,
    text: CONFIRM_MESSAGE,
    confirmText: 'Publicar',
  })
  if (!confirmed) return
  publishing.value = true
  publishError.value = null
  published.value = null

  try {
    const entry = await publishTerms({
      version: typedVersion.value,
      title: title.value.trim(),
      content: content.value,
    })
    versions.value = [entry, ...versions.value]
    published.value = entry.version
    version.value = ''
    // The admin has not accepted the new version either, so this brings up the terms dialog.
    await termsStore.load()
  } catch (e) {
    if (e instanceof TermsVersionExistsError) {
      versionTaken.value = e.message
    } else {
      publishError.value = e instanceof Error ? e.message : 'Não foi possível publicar os termos.'
    }
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
        Cada publicação vira uma nova versão, com o número que você escolher. Todos os usuários
        precisam aceitar a versão atual, a última publicada, antes de usar o Akpedia; as versões
        anteriores ficam guardadas como foram publicadas.
      </div>
    </div>

    <div v-if="status === 'loading'" class="text-muted">Carregando os termos…</div>
    <div v-else-if="status === 'error'" class="admin-feedback admin-feedback--error">
      <CircleAlert :size="19" />
      <span>{{ loadError }}</span>
    </div>

    <div v-else class="terms-layout">
      <form class="admin-card" @submit.prevent="publish">
        <div class="text-title-small">
          {{ versions.length ? 'Publicar nova versão' : 'Publicar a primeira versão' }}
        </div>

        <label class="form-field">
          <span class="text-label-small">Versão</span>
          <AkInput
            v-model="version"
            class="version-input"
            :class="{ 'version-input--invalid': versionError }"
            placeholder="1.0"
          />
          <span v-if="versionError" class="field-hint field-error" role="alert">
            {{ versionError }}
          </span>
          <span v-else class="text-muted field-hint">{{ versionHint }}</span>
        </label>

        <label class="form-field">
          <span class="text-label-small">Título</span>
          <AkInput v-model="title" placeholder="Termos de uso" />
        </label>

        <label class="form-field">
          <span class="text-label-small">Texto</span>
          <AkTextarea
            v-model="content"
            :rows="12"
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
            {{ publishLabel }}
          </AkButton>
        </div>
      </form>

      <section class="admin-card admin-versions">
        <div class="versions-title">
          <span class="text-title-small">Versões publicadas</span>
          <span v-if="versions.length" class="versions-count">{{ versions.length }}</span>
        </div>
        <div v-if="versions.length === 0" class="text-muted versions-empty">
          Nenhuma versão publicada ainda, então ninguém precisa aceitar termos para usar o Akpedia.
          A primeira versão publicada passa a valer para todos.
        </div>
        <div
          v-for="(version, index) in versions"
          v-else
          :key="version.version"
          class="version-item"
          :class="{ current: index === 0 }"
        >
          <span v-if="index === 0" class="current-chip">Atual</span>
          <AkAccordion
            class="version-accordion"
            :title="`Versão ${version.version} — ${version.title}`"
          >
            <div class="text-muted version-meta">
              Publicada em {{ formatDate(version.publishedAt) }}
              <template v-if="version.publishedBy"> por {{ version.publishedBy }}</template>
            </div>
            <div class="version-content">{{ version.content }}</div>
          </AkAccordion>
        </div>
      </section>
    </div>
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
/* The form on the left, the published versions beside it; stacked on narrow screens. */
.terms-layout {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(320px, 6fr);
  gap: var(--spacing-6);
  align-items: start;
}
@media (max-width: 1100px) {
  .terms-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
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
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}
/* A version is a few characters: the field stays short. */
.version-input {
  max-width: 12rem;
}
.version-input--invalid,
.version-input--invalid:focus-within {
  border-color: var(--color-wine);
}
.field-hint {
  font-size: var(--font-sm);
}
.field-error {
  color: var(--color-wine);
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
  gap: var(--spacing-3);
}
.versions-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-1);
}
.versions-count {
  min-width: 1.5rem;
  padding: 0 var(--spacing-2);
  border-radius: var(--round-pill);
  font-size: var(--font-sm);
  font-weight: 700;
  line-height: 1.5rem;
  text-align: center;
  color: var(--color-primary);
  background-color: var(--color-primary-selected);
}
.version-item {
  padding: var(--spacing-4) var(--spacing-5);
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  background-color: var(--color-white);
}
.version-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-3);
}
.version-accordion {
  flex: 1;
  min-width: 0;
}
.version-item.current {
  border-color: var(--color-primary);
}
.current-chip {
  flex: none;
  display: inline-flex;
  font-size: var(--font-sm);
  font-weight: 700;
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--round-lg);
  color: var(--color-white);
  background-color: var(--color-primary);
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
