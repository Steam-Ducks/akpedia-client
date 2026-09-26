<script setup lang="ts">
import { ArrowLeft, EyeOff, ZoomIn, ZoomOut } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import {
  fetchDocumentPage,
  fetchDocumentPreview,
  type DocumentPreview,
} from '@/services/document-viewer'
import { viewerFrameHtml, type FromFrame, type ToFrame } from '@/services/viewer-frame'
import { useResultStore } from '@/stores/result-store'

/** How long the pages stay hidden after a screen capture key is seen. */
const CAPTURE_SHIELD_MS = 2000
const MIN_ZOOM = 0.5
const MAX_ZOOM = 2
const ZOOM_STEP = 0.25

const route = useRoute('/docs/[id]')
const router = useRouter()
const documentId = computed(() => Number(route.params.id))

const resultStore = useResultStore()
const {
  query,
  results,
  recent,
  status: searchStatus,
  error: searchError,
} = storeToRefs(resultStore)

const frame = ref<HTMLIFrameElement | null>(null)
const preview = ref<DocumentPreview | null>(null)
const error = ref<string | null>(null)
const currentPage = ref(1)
const zoom = ref(1)
const shielded = ref(false)

let frameReady = false
let captureTimer: ReturnType<typeof setTimeout> | undefined

function post(message: ToFrame) {
  // The frame's origin is opaque (sandboxed srcdoc), so it cannot be named as the target.
  frame.value?.contentWindow?.postMessage(message, '*')
}

function initFrame() {
  if (!frameReady || !preview.value) return
  post({ type: 'init', pageCount: preview.value.page_count })
  post({ type: 'zoom', zoom: zoom.value })
}

async function load(id: number) {
  preview.value = null
  error.value = null
  currentPage.value = 1
  if (!Number.isInteger(id) || id < 1) {
    error.value = 'Documento inválido.'
    return
  }
  try {
    const found = await fetchDocumentPreview(id)
    if (id !== documentId.value) return
    preview.value = found
    initFrame()
  } catch (e) {
    if (id !== documentId.value) return
    error.value = e instanceof Error ? e.message : 'Não foi possível abrir o documento.'
  }
}

async function sendPage(page: number) {
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

function shield() {
  shielded.value = true
}

function unshieldIfFocused() {
  if (captureTimer === undefined && document.hasFocus()) shielded.value = false
}

/**
 * Hides the pages when focus leaves the app altogether -- which is what most capture tools
 * do on their way in. Checked on the next tick because moving focus into the iframe also
 * blurs this window, and that must not count.
 */
function shieldIfFocusLeft() {
  setTimeout(() => {
    if (!document.hasFocus()) shield()
  })
}

function onCapture() {
  shield()
  clearTimeout(captureTimer)
  captureTimer = setTimeout(() => {
    captureTimer = undefined
    unshieldIfFocused()
  }, CAPTURE_SHIELD_MS)
  // Overwrites what Print Screen put on the clipboard, where the browser allows it.
  navigator.clipboard?.writeText('').catch(() => {})
}

function onMessage(event: MessageEvent<FromFrame>) {
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

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'PrintScreen') {
    event.preventDefault()
    onCapture()
    return
  }
  const key = event.key.toLowerCase()
  if ((event.ctrlKey || event.metaKey) && (key === 'p' || key === 's')) {
    event.preventDefault()
  }
  if (event.metaKey && event.shiftKey && ['3', '4', '5'].includes(event.key)) {
    onCapture()
  }
}

function onVisibilityChange() {
  if (document.hidden) shield()
}

function setZoom(value: number) {
  zoom.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
  post({ type: 'zoom', zoom: zoom.value })
}

function goBack() {
  if (window.history.state?.back) router.back()
  else router.push('/')
}

watch(documentId, load, { immediate: true })

onMounted(() => {
  window.addEventListener('message', onMessage)
  window.addEventListener('keydown', onKeydown, true)
  window.addEventListener('keyup', onKeydown, true)
  window.addEventListener('blur', shieldIfFocusLeft)
  window.addEventListener('focus', unshieldIfFocused)
  document.addEventListener('visibilitychange', onVisibilityChange)
  document.body.classList.add('ak-no-print')
  if (recent.value.length === 0) resultStore.loadRecent()
  // A query in the URL (from the home page, or a reloaded/shared link) restores the search.
  const urlQuery = typeof route.query.q === 'string' ? route.query.q.trim() : ''
  if (urlQuery && (urlQuery !== query.value.trim() || searchStatus.value === 'idle')) {
    query.value = urlQuery
    resultStore.search(urlQuery)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  window.removeEventListener('keydown', onKeydown, true)
  window.removeEventListener('keyup', onKeydown, true)
  window.removeEventListener('blur', shieldIfFocusLeft)
  window.removeEventListener('focus', unshieldIfFocused)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  document.body.classList.remove('ak-no-print')
  clearTimeout(captureTimer)
})
</script>

<template>
  <main class="ak-viewer">
    <aside class="viewer-search">
      <AkSearchbox compact />
      <div class="search-list">
        <template v-if="searchStatus === 'idle' && recent.length > 0">
          <div class="text-muted">Documentos recentes</div>
          <AkResultCard v-for="item in recent" :key="item.documentData.id" :payload="item" />
        </template>
        <div v-else-if="searchStatus === 'loading'" class="text-muted">Buscando documentos…</div>
        <div v-else-if="searchStatus === 'error'" class="text-muted">{{ searchError }}</div>
        <div v-else-if="searchStatus === 'done' && results.length === 0" class="text-muted">
          Nenhum documento encontrado para essa busca.
        </div>
        <template v-else-if="searchStatus === 'done'">
          <div class="text-muted">
            {{ results.length }}
            {{ results.length === 1 ? 'documento encontrado' : 'documentos encontrados' }}
          </div>
          <AkResultCard v-for="item in results" :key="item.documentData.id" :payload="item" />
        </template>
      </div>
    </aside>

    <div class="viewer-main">
      <div class="viewer-toolbar">
        <AkButton icon @click="goBack"><ArrowLeft :size="19" /></AkButton>
        <div class="viewer-title text-title-small">{{ preview?.name ?? 'Documento' }}</div>
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
        <div v-if="error" class="viewer-message text-muted">{{ error }}</div>
        <div v-else-if="!preview" class="viewer-message text-muted">Abrindo documento…</div>
        <iframe
          v-show="preview && !error"
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
  </main>
</template>

<style scoped>
.ak-viewer {
  height: 100%;
  display: flex;
}

.viewer-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.viewer-search {
  width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  border-right: 1px solid var(--color-border);
}

.search-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  font-size: var(--font-md);
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
</style>

<style>
/* The viewer's pages must not reach paper, or a "print to PDF", from the app's own print either. */
@media print {
  body.ak-no-print #app {
    display: none !important;
  }
}
</style>
