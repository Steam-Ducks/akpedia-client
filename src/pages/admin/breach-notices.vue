<script setup lang="ts">
import { CircleAlert, CircleCheckBig, Search, X } from '@lucide/vue'
import {
  fetchBreachNoticeTemplate,
  previewBreachNotice,
  sendBreachNotice,
} from '@/services/breach-notices'
import { fetchAdminUsers } from '@/services/admin-users'
import type { AdminUser } from '@/types/AdminUser'
import type {
  BreachNoticeDraft,
  BreachNoticeField,
  BreachNoticePreview,
  BreachNoticeSendResult,
} from '@/types/BreachNotice'
import { confirmAction } from '@/utils/confirm'

definePage({ meta: { roles: ['ADMIN'] } })

const SEARCH_DELAY_MS = 300
const SEARCH_SIZE = 20

const status = ref<'loading' | 'done' | 'error'>('loading')
const loadError = ref<string | null>(null)

const subject = ref('')
const body = ref('')
const fields = ref<BreachNoticeField[]>([])
const fieldValues = ref<Record<string, string>>({})

const recipientMode = ref<'all' | 'selected'>('all')
const search = ref('')
const found = ref<AdminUser[]>([])
const searchError = ref<string | null>(null)
const selected = ref<AdminUser[]>([])

const anpdInformed = ref(false)

const previewing = ref(false)
const preview = ref<BreachNoticePreview | null>(null)
const previewError = ref<string | null>(null)

const sending = ref(false)
const sendError = ref<string | null>(null)
const result = ref<BreachNoticeSendResult | null>(null)

const history = ref<{ reload: () => Promise<void>; $el: HTMLElement } | null>(null)
const textCard = ref<HTMLElement | null>(null)

/** Below this the message box is not shrunk to match a short list of notices. */
const MIN_BODY_HEIGHT_PX = 160
let bodySized = false

/**
 * Once, on the first load: grows or shrinks the message box so the Texto card is as tall as the
 * notices sent beside it. Only side by side (wide screens); the admin can resize it afterwards.
 */
const matchTextCardToHistory = () => {
  if (bodySized) return
  bodySized = true
  const historyElement = history.value?.$el
  const card = textCard.value
  const textarea = card?.querySelector<HTMLTextAreaElement>('.notice-body textarea')
  if (!historyElement || !card || !textarea) return
  if (historyElement.offsetTop !== card.offsetTop) return
  const difference = historyElement.offsetHeight - card.offsetHeight
  textarea.style.height = `${Math.max(MIN_BODY_HEIGHT_PX, textarea.offsetHeight + difference)}px`
}

const filledFields = computed(() => fields.value.filter((field) => !field.automatic))

const recipientCount = computed(() => selected.value.length)

const missingRequired = computed(() =>
  filledFields.value.some((field) => field.required && !fieldValues.value[field.name]?.trim()),
)

const hasRecipients = computed(() => recipientMode.value === 'all' || recipientCount.value > 0)

const canSend = computed(
  () =>
    subject.value.trim() !== '' &&
    body.value.trim() !== '' &&
    !missingRequired.value &&
    hasRecipients.value &&
    anpdInformed.value &&
    !sending.value,
)

const draft = (): BreachNoticeDraft => ({
  subject: subject.value,
  body: body.value,
  fields: Object.fromEntries(
    filledFields.value.map((field) => [field.name, fieldValues.value[field.name] ?? '']),
  ),
  recipients: recipientMode.value === 'all' ? 'all' : selected.value.map((user) => user.id),
})

const load = async () => {
  status.value = 'loading'
  loadError.value = null
  try {
    const template = await fetchBreachNoticeTemplate()
    subject.value = template.subject
    body.value = template.body
    fields.value = template.fields
    fieldValues.value = Object.fromEntries(template.fields.map((field) => [field.name, '']))
    status.value = 'done'
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Não foi possível carregar o modelo.'
    status.value = 'error'
  }
}

let latestSearch = 0

const searchUsers = async () => {
  const request = ++latestSearch
  searchError.value = null
  try {
    const page = await fetchAdminUsers({ search: search.value, size: SEARCH_SIZE })
    if (request === latestSearch) found.value = page.content
  } catch (e) {
    if (request !== latestSearch) return
    searchError.value = e instanceof Error ? e.message : 'Não foi possível buscar os usuários.'
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(searchUsers, SEARCH_DELAY_MS)
})

watch(recipientMode, (mode) => {
  if (mode === 'selected' && found.value.length === 0) searchUsers()
})

const isSelected = (user: AdminUser) => selected.value.some((entry) => entry.id === user.id)

const toggle = (user: AdminUser) => {
  selected.value = isSelected(user)
    ? selected.value.filter((entry) => entry.id !== user.id)
    : [...selected.value, user]
}

const showPreview = async () => {
  previewing.value = true
  previewError.value = null
  try {
    preview.value = await previewBreachNotice(draft())
  } catch (e) {
    preview.value = null
    previewError.value =
      e instanceof Error ? e.message : 'Não foi possível gerar a pré-visualização.'
  } finally {
    previewing.value = false
  }
}

const recipientsText = computed(() =>
  recipientMode.value === 'all'
    ? 'todos os usuários'
    : recipientCount.value === 1
      ? '1 pessoa'
      : `${recipientCount.value} pessoas`,
)

const resultSummary = computed(() => {
  if (!result.value) return ''
  const { sent, total, failed } = result.value
  return `${sent} de ${total} e-mails enviados${failed ? `; ${failed} falharam` : ''}.`
})

const submit = async () => {
  if (!canSend.value) return
  const confirmed = await confirmAction({
    title: 'Enviar o aviso de vazamento?',
    text: `O aviso será enviado por e-mail para ${recipientsText.value}.`,
    confirmText: 'Enviar',
  })
  if (!confirmed) return
  sending.value = true
  sendError.value = null
  result.value = null
  try {
    result.value = await sendBreachNotice(draft())
    history.value?.reload()
  } catch (e) {
    sendError.value = e instanceof Error ? e.message : 'Não foi possível enviar o aviso.'
  } finally {
    sending.value = false
  }
}

onMounted(load)
onBeforeUnmount(() => clearTimeout(searchTimer))
</script>

<template>
  <main class="ak-admin-breach-notices">
    <div class="admin-header">
      <div class="text-title-large">Aviso de vazamento de dados</div>
      <div class="text-muted">
        Avise por e-mail os funcionários afetados por um incidente com os dados deles. O envio só é
        liberado depois que você confirmar que a ANPD já foi informada.
      </div>
    </div>

    <div v-if="status === 'loading'" class="text-muted">Carregando o modelo do aviso…</div>
    <div v-else-if="status === 'error'" class="admin-feedback admin-feedback--error">
      <CircleAlert :size="19" />
      <span>{{ loadError }}</span>
    </div>

    <div v-else class="notice-layout">
      <form class="notice-form" @submit.prevent="submit">
        <section ref="textCard" class="admin-card">
          <div class="text-title-small">Texto</div>
          <label class="form-field">
            <span class="text-label-small">Assunto</span>
            <AkInput v-model="subject" class="notice-subject" />
          </label>
          <label class="form-field">
            <span class="text-label-small">Mensagem</span>
            <AkTextarea v-model="body" class="notice-body" :rows="14" />
          </label>
        </section>

        <section class="admin-card">
          <div class="text-title-small">Dados do incidente</div>
          <label v-for="field in filledFields" :key="field.name" class="form-field">
            <span class="text-label-small">
              {{ field.description }}<span v-if="field.required" class="required"> *</span>
            </span>
            <AkInput
              v-model="fieldValues[field.name]"
              :class="`field-${field.name}`"
              :placeholder="field.example"
            />
          </label>
        </section>

        <section class="admin-card">
          <div class="text-title-small">Destinatários</div>
          <fieldset class="recipient-modes">
            <label class="role-option">
              <input v-model="recipientMode" type="radio" value="all" name="recipients" />
              <span>Todos os usuários</span>
            </label>
            <label class="role-option">
              <input v-model="recipientMode" type="radio" value="selected" name="recipients" />
              <span>Pessoas selecionadas</span>
            </label>
          </fieldset>

          <template v-if="recipientMode === 'selected'">
            <div v-if="selected.length" class="chips">
              <span v-for="user in selected" :key="user.id" class="chosen-chip">
                {{ user.name || user.email }}
                <button
                  type="button"
                  class="chip-remove"
                  :aria-label="`Remover ${user.name || user.email}`"
                  @click="toggle(user)"
                >
                  <X :size="14" />
                </button>
              </span>
            </div>
            <AkInput v-model="search" class="users-search" placeholder="Buscar por nome ou e-mail">
              <template #pre><Search :size="19" aria-hidden="true" /></template>
            </AkInput>
            <div v-if="searchError" class="admin-feedback admin-feedback--error">
              <CircleAlert :size="19" />
              <span>{{ searchError }}</span>
            </div>
            <ul class="user-list">
              <li v-for="user in found" :key="user.id">
                <label class="user-option">
                  <input type="checkbox" :checked="isSelected(user)" @change="toggle(user)" />
                  <span class="user-name">{{ user.name || user.email }}</span>
                  <span class="text-muted">{{ user.email }}</span>
                  <AkStatusChip v-if="!user.enabled" status="DISABLED" />
                </label>
              </li>
            </ul>
          </template>
        </section>

        <section class="admin-card">
          <div class="text-title-small">Enviar</div>
          <div class="preview-row">
            <AkButton type="button" :disabled="previewing" @click="showPreview">
              {{ previewing ? 'Gerando…' : 'Pré-visualizar e-mail' }}
            </AkButton>
          </div>
          <div v-if="previewError" class="admin-feedback admin-feedback--error preview-error">
            <CircleAlert :size="19" />
            <span>{{ previewError }}</span>
          </div>
          <div v-if="preview" class="preview">
            <div class="preview-subject">{{ preview.subject }}</div>
            <div class="preview-body">{{ preview.body }}</div>
          </div>

          <label class="role-option">
            <input v-model="anpdInformed" type="checkbox" class="anpd" />
            <span>Confirmo que a ANPD já foi informada</span>
          </label>

          <div v-if="sendError" class="admin-feedback admin-feedback--error send-error">
            <CircleAlert :size="19" />
            <span>{{ sendError }}</span>
          </div>
          <div v-if="result" class="send-result">
            <div class="admin-feedback admin-feedback--success">
              <CircleCheckBig :size="19" />
              <span>{{ resultSummary }}</span>
            </div>
            <ul v-if="result.failures.length" class="failures">
              <li v-for="failure in result.failures" :key="failure.email">
                {{ failure.email }}: {{ failure.error }}
              </li>
            </ul>
          </div>

          <div class="form-actions">
            <AkButton type="submit" color="primary" :disabled="!canSend">
              {{ sending ? 'Enviando…' : 'Enviar aviso' }}
            </AkButton>
          </div>
        </section>
      </form>

      <AkBreachNoticeHistory
        ref="history"
        class="notice-history"
        @loaded="matchTextCardToHistory"
      />
    </div>
  </main>
</template>

<style scoped>
.ak-admin-breach-notices {
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
/* The form on the left, the notices sent beside it; stacked on narrow screens. */
.notice-layout {
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(320px, 5fr);
  gap: var(--spacing-6);
  align-items: start;
}
@media (max-width: 1100px) {
  .notice-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
.notice-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
  min-width: 0;
}
.notice-history {
  max-width: none;
}
.admin-card {
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
.required {
  color: var(--color-wine);
}
.recipient-modes {
  display: flex;
  gap: var(--spacing-6);
  border: 0;
  padding: 0;
}
.role-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}
.chosen-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--round-pill);
  font-size: var(--font-sm);
  color: var(--color-primary);
  background-color: var(--color-primary-selected);
}
.chip-remove {
  display: inline-flex;
  cursor: pointer;
  color: inherit;
}
.user-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 16rem;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
}
.user-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  cursor: pointer;
}
.user-name {
  font-weight: 600;
}
.preview-row,
.form-actions {
  display: flex;
  justify-content: flex-end;
}
.preview {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  background-color: var(--color-foreground);
}
.preview-subject {
  font-weight: 700;
}
.preview-body {
  white-space: pre-line;
  line-height: 1.5;
  overflow-wrap: anywhere;
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
.send-result {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}
.failures {
  margin: 0;
  padding-left: var(--spacing-6);
  color: var(--color-wine);
}
</style>
