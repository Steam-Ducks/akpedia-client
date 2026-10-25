<script setup lang="ts">
import { CircleAlert, CircleCheckBig, FileText, Upload, X } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { useUploadStore } from '@/stores/upload-store'

const uploadStore = useUploadStore()
const { status, error, categories, categoryId, categoryConfidence, name, description } =
  storeToRefs(uploadStore)

const fileInput = ref<HTMLInputElement | null>(null)
const fileName = ref('')

const confidencePercent = computed(() =>
  categoryConfidence.value === null ? null : Math.round(categoryConfidence.value * 100),
)

const openPicker = () => {
  if (status.value !== 'analyzing') fileInput.value?.click()
}

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  fileName.value = file.name
  uploadStore.analyze(file)
}

const submit = () => {
  uploadStore.submit()
}

const startOver = () => {
  fileName.value = ''
  uploadStore.reset()
}

onMounted(() => {
  uploadStore.loadCategories()
})
</script>

<template>
  <main class="ak-upload">
    <div class="upload-header">
      <div class="text-title-large">Enviar documento</div>
      <div class="text-muted">
        Envie um PDF, Word ou Excel. O akpedia sugere a categoria e os detalhes, e você confere
        antes de enviar para revisão.
      </div>
    </div>

    <div class="upload-card">
      <template v-if="status === 'idle' || status === 'analyzing'">
        <div v-if="error" class="upload-feedback upload-feedback--error">
          <CircleAlert :size="19" />
          <span>{{ error }}</span>
        </div>

        <div class="dropzone" :class="{ busy: status === 'analyzing' }" @click="openPicker">
          <input
            ref="fileInput"
            type="file"
            class="dropzone-input"
            accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            @change="onFileChange"
          />
          <template v-if="status === 'analyzing'">
            <FileText :size="32" />
            <div class="text-title-small">{{ fileName }}</div>
            <div class="text-muted">Analisando o arquivo…</div>
          </template>
          <template v-else>
            <Upload :size="32" />
            <div class="text-title-small">Clique para escolher um arquivo</div>
            <div class="text-muted">PDF, Word ou Excel</div>
          </template>
        </div>
      </template>

      <template v-else-if="status === 'review' || status === 'submitting'">
        <form class="upload-form" @submit.prevent="submit">
          <div class="suggestion-banner">
            <FileText :size="19" />
            <span class="text-title-small">{{ fileName }}</span>
            <span v-if="confidencePercent !== null" class="confidence-badge">
              Sugestão com {{ confidencePercent }}% de confiança
            </span>
          </div>

          <label class="form-field">
            <span class="text-label-small">Categoria</span>
            <AkSelect v-model="categoryId" required>
              <option :value="null" disabled>Selecione uma categoria</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </AkSelect>
          </label>

          <label class="form-field">
            <span class="text-label-small">Título</span>
            <AkInput v-model="name" placeholder="Título do documento" />
          </label>

          <label class="form-field">
            <span class="text-label-small">Descrição</span>
            <AkTextarea v-model="description" placeholder="Descrição do documento" />
          </label>

          <div v-if="error" class="upload-feedback upload-feedback--error">
            <CircleAlert :size="19" />
            <span>{{ error }}</span>
          </div>

          <div class="form-actions">
            <AkButton type="button" @click="startOver">
              <X :size="19" />
              Escolher outro arquivo
            </AkButton>
            <AkButton type="submit" color="primary" :disabled="status === 'submitting'">
              {{ status === 'submitting' ? 'Enviando…' : 'Enviar para revisão' }}
            </AkButton>
          </div>
        </form>
      </template>

      <template v-else-if="status === 'submitted'">
        <div class="upload-feedback upload-feedback--success">
          <CircleCheckBig :size="32" />
          <div class="text-title-small">Documento enviado</div>
          <div class="text-muted">"{{ name }}" está aguardando revisão de um aprovador.</div>
          <AkButton color="primary" @click="startOver">Enviar outro documento</AkButton>
        </div>
      </template>
    </div>
  </main>
</template>

<style scoped>
.ak-upload {
  padding: var(--spacing-10);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}

.upload-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.upload-card {
  max-width: 640px;
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  background-color: var(--color-white);
  padding: var(--spacing-8);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.dropzone {
  position: relative;
  border: 1px dashed var(--color-border);
  border-radius: var(--round-lg);
  padding: var(--spacing-10);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-2);
  text-align: center;
  cursor: pointer;
  color: var(--color-text-muted);
  transition: all 0.2s ease;
}

.dropzone:hover:not(.busy) {
  border-color: var(--color-primary-muted);
  background-color: var(--color-background-hover);
}

.dropzone.busy {
  cursor: default;
}

.dropzone-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
}

.upload-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.suggestion-banner {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

.confidence-badge {
  font-size: var(--font-sm);
  font-weight: 700;
  color: var(--color-primary);
  background-color: var(--color-primary-selected);
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--round-pill);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  flex: 1;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-3);
}

.upload-feedback {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-6);
}

.upload-feedback--error {
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  color: var(--color-wine);
  background-color: var(--color-wine-lighest);
  border-radius: var(--round-lg);
  padding: var(--spacing-4);
}

.upload-feedback--success {
  color: var(--color-text);
}
</style>
