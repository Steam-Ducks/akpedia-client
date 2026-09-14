<script setup lang="ts">
import type { ResultPayload } from '@/types/DocData';
const userName = 'Camila'
const empresaName = 'Akaer'

const resultList: ResultPayload[] = [
  {
    documentData: {
      title: 'Manual de Integração do Sistema de Navegação',
      docName: 'AKA-ENG-042',
      shortDescription: 'Procedimentos para integração, configuração e validação do sistema de navegação embarcado.',
      responsableName: 'Mariana Costa',
      lastUpdate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      category: 'Técnica'
    },
    accuracy: 0.98
  },
  {
    documentData: {
      title: 'Diretriz de Gestão de Riscos de Projeto',
      docName: 'AKA-NOR-018',
      shortDescription: 'Diretrizes para identificar, avaliar, tratar e acompanhar riscos ao longo do ciclo do projeto.',
      responsableName: 'Rafael Mendes',
      lastUpdate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      category: 'Normativa'
    },
    accuracy: 0.95
  },
  {
    documentData: {
      title: 'Termo de Confidencialidade — Fornecedores',
      docName: 'AKA-JUR-007',
      shortDescription: 'Modelo padrão para formalização de confidencialidade com fornecedores e parceiros estratégicos.',
      responsableName: 'Luiza Araújo',
      lastUpdate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      category: 'Jurídica'
    },
    accuracy: 0.91
  }
]

</script>

<template>
  <main class="ak-general">
    <div class="salutation-wrapper">
      <div class="salutation-date">Terça-feira, 08 de setembro</div>
      <div class="salutation-welcome text-title-large">
        Olá, {{ userName }}. <span class="text-highlight">O que você procura?</span>
      </div>
      <div class="salutation-description">
        Encontre documentos técnicos, normativas e informações de {{ empresaName }} em um só lugar.
      </div>
    </div>
    <AkSearchbox />
    <div class="result-section">
      <div class="result-list">
        <AkResultCard v-for="(result, i) in resultList" :key="i" :payload="result" />
      </div>
    </div>
  </main>
</template>

<style scoped>
.ak-general {
  padding: var(--spacing-10);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.salutation-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

.salutation-date {
  color: var(--color-text-muted);
  text-transform: uppercase;
  font-size: var(--font-md);
  font-weight: 600;
}
.salutation-description {
  color: var(--color-text-muted);
}
.result-section {
  display: flex;
  gap: var(--spacing-4);
}

.result-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}
</style>
