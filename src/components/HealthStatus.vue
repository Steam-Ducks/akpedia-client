<script setup lang="ts">
import { ref } from 'vue'
import { API_BASE_URL } from '@/config/api'

type Status = 'idle' | 'loading' | 'up' | 'down'

const status = ref<Status>('idle')

async function checkHealth(): Promise<void> {
  status.value = 'loading'
  try {
    const response = await fetch(`${API_BASE_URL}/health`)
    const body = (await response.json()) as { status?: string }
    status.value = response.ok && body.status === 'UP' ? 'up' : 'down'
  } catch {
    status.value = 'down'
  }
}

defineExpose({ checkHealth, status })
</script>

<template>
  <section class="health">
    <p>
      API: <code>{{ API_BASE_URL }}</code>
    </p>
    <button type="button" @click="checkHealth">Verificar conexão</button>
    <p class="health__result" :data-status="status">
      <span v-if="status === 'idle'">Ainda não verificado.</span>
      <span v-else-if="status === 'loading'">Verificando…</span>
      <span v-else-if="status === 'up'">Servidor disponível (UP).</span>
      <span v-else>Servidor indisponível.</span>
    </p>
  </section>
</template>
