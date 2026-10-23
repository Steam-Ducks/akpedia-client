<script setup lang="ts">
import { ArrowLeft, CircleAlert, EyeOff, ZoomIn, ZoomOut } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { usePendingStore } from '@/stores/pending-store'
import {
  approveDocument,
  rejectDocument,
  type ApproveCorrections,
} from '@/services/document-review'
import {
  fetchDocumentPage,
  fetchDocumentPreview,
  type DocumentPreview,
} from '@/services/document-viewer'
import { viewerFrameHtml, type FromFrame, type ToFrame } from '@/services/viewer-frame'
import { fetchCategories } from '@/services/search'
import type { Category } from '@/types/SearchResult'
import type { PendingDocument } from '@/services/pending-mapper'

/** How long the pages stay hidden after a screen capture key is seen. */
const CAPTURE_SHIELD_MS = 2000
const MIN_ZOOM = 0.5
const MAX_ZOOM = 2
const ZOOM_STEP = 0.25

const route = useRoute('/review/[id]')
const router = useRouter()
const documentId = computed(() => Number(route.params.id))

const pendingStore = usePendingStore()
const { pendingDocuments, status: listStatus } = storeToRefs(pendingStore)
const pending = computed(
  () => pendingDocuments.value.find((item) => item.id === documentId.value) ?? null,
)

const categories = ref<Category[]>([])
const name = ref('')
const description = ref('')
const categoryId = ref<number | null>(null)

const actionStatus = ref<'idle' | 'approving' | 'rejecting'>('idle')
const actionError = ref<string | null>(null)
const showRejectModal = ref(false)
const rejectComment = ref('')

const frame = ref<HTMLIFrameElement | null>(null)
const preview = ref<DocumentPreview | null>(null)
const viewerError = ref<string | null>(null)
const currentPage = ref(1)
const zoom = ref(1)
const shielded = ref(false)

let frameReady = false
let captureTimer: ReturnType<typeof setTimeout> | undefined

const fillForm = (document: PendingDocument) => {
  name.value = document.name
  description.value = ''
  categoryId.value = document.suggestedCategoryId
}

const post = (message: ToFrame) => {
  // The frame's origin is opaque (sandboxed srcdoc), so it cannot be named as the target.
  frame.value?.contentWindow?.postMessage(message, '*')
}

const initFrame = () => {
  if (!frameReady || !preview.value) return
  post({ type: 'init', pageCount: preview.value.page_count })
  post({ type: 'zoom', zoom: zoom.value })
}

const loadViewer = async (id: number) => {
  preview.value = null
  viewerError.value = null
  currentPage.value = 1
  try {
    const found = await fetchDocumentPreview(id)
    if (id !== documentId.value) return
    preview.value = found
    initFrame()
  } catch (e) {
    if (id !== documentId.value) return
    viewerError.value = e instanceof Error ? e.message : 'Não foi possível abrir o documento.'
  }
}

const sendPage = async (page: number) => {
  const id = documentId.value
  try {
    const image = await fetchDocumentPage(id, page)
    if (id === documentId.value) post({ type: 'page', page, image })
  } catch (e) {
    if (id !== documentId.value) return
    const message = e instanceof Error ? e.message : `Não foi possível carregar a página ${page}.`
    post({ type: 'page-error', page, message })
  }
}

const shield = () => {
  shielded.value = true
}

const unshieldIfFocused = () => {
  if (captureTimer === undefined && document.hasFocus()) shielded.value = false
}

const shieldIfFocusLeft = () => {
  setTimeout(() => {
    if (!document.hasFocus()) shield()
  })
}

const onCapture = () => {
  shield()
  clearTimeout(captureTimer)
  captureTimer = setTimeout(() => {
    captureTimer = undefined
    unshieldIfFocused()
  }, CAPTURE_SHIELD_MS)
  navigator.clipboard?.writeText('').catch(() => {})
}

const onMessage = (event: MessageEvent<FromFrame>) => {
  if (!frame.value || event.source !== frame.value.contentWindow) return
  const message = event.data
  switch (message.type) {
    case 'ready':
      frameReady = true
      initFrame()
      break
    case 'need':
      sendPage(message.page)
      break
    case 'visible':
      currentPage.value = message.page
      break
    case 'capture':
      onCapture()
      break
    case 'blur':
      shieldIfFocusLeft()
      break
    case 'focus':
      unshieldIfFocused()
      break
  }
}

const setZoom = (value: number) => {
  zoom.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
  post({ type: 'zoom', zoom: zoom.value })
}

const goBack = () => {
  router.push('/review')
}

const openRejectModal = () => {
  rejectComment.value = ''
  showRejectModal.value = true
}

const closeRejectModal = () => {
  showRejectModal.value = false
}

const approve = async () => {
  if (!pending.value || !name.value.trim()) return
  actionStatus.value = 'approving'
  actionError.value = null

  const corrections: ApproveCorrections = { name: name.value.trim() }
  if (description.value.trim()) corrections.description = description.value.trim()
  if (categoryId.value !== null) corrections.categoryId = categoryId.value

  try {
    await approveDocument(pending.value.id, corrections)
    await pendingStore.load()
    router.push('/review')
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Não foi possível aprovar o documento.'
    actionStatus.value = 'idle'
  }
}

const reject = async () => {
  if (!pending.value || !rejectComment.value.trim()) return
  actionStatus.value = 'rejecting'
  actionError.value = null

  try {
    await rejectDocument(pending.value.id, rejectComment.value.trim())
    showRejectModal.value = false
    await pendingStore.load()
    router.push('/review')
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Não foi possível devolver o documento.'
    actionStatus.value = 'idle'
  }
}

watch(
  pending,
  (value) => {
    if (value) fillForm(value)
  },
  { immediate: true },
)

watch(documentId, loadViewer, { immediate: true })

onMounted(() => {
  fetchCategories()
    .then((list) => {
      categories.value = list
    })
    .catch(() => {
      categories.value = []
    })
  if (pendingDocuments.value.length === 0) pendingStore.load()

  window.addEventListener('message', onMessage)
  window.addEventListener('blur', shieldIfFocusLeft)
  window.addEventListener('focus', unshieldIfFocused)
  document.body.classList.add('ak-no-print')
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  window.removeEventListener('blur', shieldIfFocusLeft)
  window.removeEventListener('focus', unshieldIfFocused)
  document.body.classList.remove('ak-no-print')
  clearTimeout(captureTimer)
})
</script>

<template>
  <main class="ak-review">
    <div v-if="!pending && listStatus === 'loading'" class="review-message text-muted">
      Carregando documento…
    </div>
    <div v-else-if="!pending" class="review-message">
      <div class="text-title-small">Este documento não está mais na fila de revisão.</div>
      <AkButton color="primary" @click="goBack">Voltar para pendentes</AkButton>
    </div>

    <template v-else>
      <aside class="review-form">
        <AkButton icon @click="goBack"><ArrowLeft :size="19" /></AkButton>

        <div class="form-header">
          <div class="text-title-small">{{ pending.creatorName }} · {{ pending.sectorName }}</div>
          <div v-if="pending.suggestedCategory" class="text-muted">
            Sugestão: {{ pending.suggestedCategory }}
            <template v-if="pending.confidence !== null">
              ({{ Math.round(pending.confidence * 100) }}%)
            </template>
          </div>
          <div v-else class="text-muted">Sem sugestão de categoria</div>
        </div>

        <label class="form-field">
          <span class="text-label-small">Título</span>
          <AkInput v-model="name" placeholder="Título do documento" />
        </label>

        <label class="form-field">
          <span class="text-label-small">Descrição</span>
          <AkTextarea v-model="description" placeholder="Deixe em branco para manter a atual" />
        </label>

        <label class="form-field">
          <span class="text-label-small">Categoria</span>
          <AkSelect v-model="categoryId">
            <option :value="null">Manter a categoria enviada</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </AkSelect>
        </label>

        <div v-if="actionError" class="form-feedback">
          <CircleAlert :size="19" />
          <span>{{ actionError }}</span>
        </div>

        <div class="form-actions">
          <AkButton :disabled="actionStatus !== 'idle'" @click="openRejectModal">Rejeitar</AkButton>
          <AkButton
            color="primary"
            :disabled="actionStatus !== 'idle' || !name.trim()"
            @click="approve"
          >
            {{ actionStatus === 'approving' ? 'Aprovando…' : 'Aprovar' }}
          </AkButton>
        </div>
      </aside>

      <div class="review-viewer">
        <div class="viewer-toolbar">
          <div class="viewer-title text-title-small">{{ preview?.name ?? pending.name }}</div>
          <template v-if="preview">
            <div class="text-muted viewer-pages">
              Página {{ currentPage }} de {{ preview.page_count }}
            </div>
            <div class="viewer-zoom">
              <AkButton icon :disabled="zoom <= MIN_ZOOM" @click="setZoom(zoom - ZOOM_STEP)">
                <ZoomOut :size="19" />
              </AkButton>
              <span class="text-muted">{{ Math.round(zoom * 100) }}%</span>
              <AkButton icon :disabled="zoom >= MAX_ZOOM" @click="setZoom(zoom + ZOOM_STEP)">
                <ZoomIn :size="19" />
              </AkButton>
            </div>
          </template>
        </div>

        <div class="viewer-body">
          <div v-if="viewerError" class="viewer-message text-muted">{{ viewerError }}</div>
          <div v-else-if="!preview" class="viewer-message text-muted">Abrindo documento…</div>
          <iframe
            v-show="preview && !viewerError"
            ref="frame"
            class="viewer-frame"
            :class="{ shielded }"
            title="Visualizador de documento"
            sandbox="allow-scripts"
            referrerpolicy="no-referrer"
            :srcdoc="viewerFrameHtml"
          />
          <div v-if="shielded && preview" class="viewer-shield" @click="unshieldIfFocused">
            <EyeOff :size="32" />
            <div class="text-title-small">Conteúdo protegido</div>
            <div class="text-muted">Clique aqui para voltar a visualizar o documento.</div>
          </div>
        </div>
      </div>

      <div v-if="showRejectModal" class="reject-overlay" @click.self="closeRejectModal">
        <div class="reject-modal">
          <div class="text-title-small">Devolver documento</div>
          <div class="text-muted">
            Explique por que o documento está voltando para {{ pending.creatorName }}.
          </div>
          <AkTextarea v-model="rejectComment" placeholder="Motivo da devolução" :rows="4" />
          <div v-if="actionError" class="form-feedback">
            <CircleAlert :size="19" />
            <span>{{ actionError }}</span>
          </div>
          <div class="form-actions">
            <AkButton :disabled="actionStatus !== 'idle'" @click="closeRejectModal">
              Cancelar
            </AkButton>
            <AkButton
              color="primary"
              :disabled="actionStatus !== 'idle' || !rejectComment.trim()"
              @click="reject"
            >
              {{ actionStatus === 'rejecting' ? 'Devolvendo…' : 'Devolver' }}
            </AkButton>
          </div>
        </div>
      </div>
    </template>
  </main>
</template>

<style scoped>
.ak-review {
  height: 100%;
  display: flex;
}

.review-message {
  margin: auto;
  padding: var(--spacing-10);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-4);
}

.review-form {
  width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
}

.form-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.form-feedback {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  color: var(--color-wine);
  background-color: var(--color-wine-lighest);
  border-radius: var(--round-lg);
  padding: var(--spacing-3);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3);
}

.review-viewer {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.viewer-toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  padding: var(--spacing-3) var(--spacing-8);
  border-bottom: 1px solid var(--color-border);
}

.viewer-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.viewer-pages {
  font-size: var(--font-md);
  font-weight: 600;
  white-space: nowrap;
}

.viewer-zoom {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  font-size: var(--font-md);
  font-weight: 600;
}

.viewer-zoom span {
  min-width: 4ch;
  text-align: center;
}

.viewer-body {
  position: relative;
  flex: 1;
  min-height: 0;
}

.viewer-frame {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}

.viewer-frame.shielded {
  filter: blur(24px);
  visibility: hidden;
}

.viewer-message {
  padding: var(--spacing-10);
}

.viewer-shield {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  background-color: var(--color-foreground);
  color: var(--color-text);
}

.reject-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(from var(--color-black) r g b / 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.reject-modal {
  width: 420px;
  max-width: calc(100vw - var(--spacing-8));
  background-color: var(--color-white);
  border-radius: var(--round-lg);
  padding: var(--spacing-6);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  box-shadow: var(--elevation-2);
}
</style>

<style>
@media print {
  body.ak-no-print #app {
    display: none !important;
  }
}
</style>
