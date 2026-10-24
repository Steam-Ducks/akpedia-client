<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSubmissionStore } from '@/stores/submission-store'
import { formatDate } from '@/utils/date'

/** How often the open screen re-checks statuses, so Processing turns into Published on its own. */
const REFRESH_INTERVAL_MS = 5000

const router = useRouter()
const submissionStore = useSubmissionStore()
const { submissions, status, error, page, totalPages, categoryIds, categories } =
  storeToRefs(submissionStore)

const expandedDocumentId = ref<number | null>(null)

let refreshTimer: ReturnType<typeof setInterval> | undefined

const toggleComment = (documentId: number) => {
  expandedDocumentId.value = expandedDocumentId.value === documentId ? null : documentId
}

const openDocument = (documentId: number) => {
  router.push(`/docs/${documentId}`)
}

const startRefreshing = () => {
  stopRefreshing()
  refreshTimer = setInterval(() => submissionStore.load(), REFRESH_INTERVAL_MS)
}

const stopRefreshing = () => clearInterval(refreshTimer)

const onVisibilityChange = () => {
  if (document.hidden) {
    stopRefreshing()
    return
  }
  submissionStore.load()
  startRefreshing()
}

onMounted(() => {
  submissionStore.load()
  submissionStore.loadCategories()
  startRefreshing()
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  stopRefreshing()
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<template>
  <main class="ak-submissions">
    <div class="submissions-header">
      <div class="text-title-large">Minhas submissões</div>
      <div class="text-muted">Acompanhe o andamento dos documentos que você enviou.</div>
    </div>

    <CategoryChips
      v-if="categories.length > 0"
      :categories="categories"
      :selected-ids="categoryIds"
      theme="light"
      @toggle="submissionStore.toggleCategory"
    />

    <div v-if="status === 'loading'" class="text-muted">Carregando suas submissões…</div>
    <div v-else-if="status === 'error'" class="text-muted">{{ error }}</div>
    <div v-else-if="status === 'done' && submissions.length === 0" class="text-muted">
      Você ainda não enviou nenhum documento.
    </div>
    <div v-else-if="status === 'done'" class="submission-list">
      <div
        v-for="submission in submissions"
        :key="submission.documentId"
        class="submission-card"
        :class="{ clickable: submission.status === 'PUBLISHED' }"
        @click="submission.status === 'PUBLISHED' && openDocument(submission.documentId)"
      >
        <div class="submission-main">
          <div class="submission-infos">
            <div class="text-title-small">{{ submission.name }}</div>
            <div class="text-muted">Enviado em {{ formatDate(submission.submittedAt) }}</div>
          </div>
          <AkStatusChip :status="submission.status" />
        </div>

        <template v-if="submission.status === 'RETURNED' && submission.reviewComment">
          <button
            type="button"
            class="comment-toggle text-button"
            @click.stop="toggleComment(submission.documentId)"
          >
            {{ expandedDocumentId === submission.documentId ? 'Ocultar motivo' : 'Ver motivo' }}
          </button>
          <div v-if="expandedDocumentId === submission.documentId" class="comment-block">
            {{ submission.reviewComment }}
          </div>
        </template>
      </div>
    </div>

    <AkPaginator
      v-if="status === 'done'"
      :page="page"
      :total-pages="totalPages"
      @change="submissionStore.goToPage"
    />
  </main>
</template>

<style scoped>
.ak-submissions {
  padding: var(--spacing-10);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.submissions-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.submission-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.submission-card {
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  padding: var(--spacing-4);
  box-shadow: var(--elevation-1);
  background-color: var(--color-white);

  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);

  transition: all 0.2s ease;
}

.submission-card.clickable {
  cursor: pointer;
}

.submission-card.clickable:hover {
  border-color: var(--color-primary-muted);
  box-shadow: var(--elevation-2);
}

.submission-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
}

.submission-infos {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
  min-width: 0;
}

.comment-toggle {
  align-self: flex-start;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--color-primary);
}

.comment-block {
  color: var(--color-text);
  background-color: var(--color-background-hover);
  border-radius: var(--round-md);
  padding: var(--spacing-3);
}
</style>
