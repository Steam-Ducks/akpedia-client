<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ACCEPT_TERMS_PATH, termsRedirect } from '@/route-access'
import { onCpfRefused, onTermsPending } from '@/services/api'
import { useAccountStore } from '@/stores/account-store'
import { useCpfStore } from '@/stores/cpf-store'
import { useTermsStore } from '@/stores/terms-store'

const route = useRoute()
const router = useRouter()
const accountStore = useAccountStore()
const { status, error } = storeToRefs(accountStore)
const termsStore = useTermsStore()
const { pending: termsPending } = storeToRefs(termsStore)
const cpfStore = useCpfStore()
const { problem: cpfProblem } = storeToRefs(cpfStore)

const onTermsPage = computed(() => route.path === ACCEPT_TERMS_PATH)

// The router's first navigation, to the address the user opened, may still be loading its page
// when GET /me answers. Until it lands, the route is the home page: sending the user to the terms
// page from there would cancel it and bring them back home after accepting.
const routerReady = ref(false)
router.isReady().then(() => {
  routerReady.value = true
})

// Terms just found pending (GET /me, or a call refused because a new version was published while
// the user is in the app): to the terms page. Just accepted: back to where the user was.
watch(
  [status, termsPending, () => route.fullPath, routerReady],
  () => {
    if (status.value !== 'done' || !routerReady.value) return
    const target = termsRedirect(route, termsPending.value)
    if (target) router.replace(target)
  },
  { immediate: true },
)

onMounted(() => {
  onTermsPending(() => {
    termsStore.pending = true
  })
  // A CPF the server refuses (invalid, or another user's): the CPF dialog comes up.
  onCpfRefused((code) => cpfStore.refused(code))
  accountStore.load()
})

onBeforeUnmount(() => {
  onTermsPending(null)
  onCpfRefused(null)
})
</script>

<template>
  <!--
    Nothing opens before GET /me tells whether the terms are pending. The terms page stands alone,
    without the sidebar and the header: their calls would get 403 terms_pending. Any other page
    waits, behind the CPF dialog, while the server refuses the user's CPF (422 invalid_cpf or
    cpf_taken), the layout dimmed and inert, without the page: it would load its data and be
    refused again.
  -->
  <template v-if="status === 'done'">
    <RouterView v-if="onTermsPage" />
    <template v-else-if="!termsPending">
      <div
        class="akpedia-page"
        :inert="cpfProblem ? true : undefined"
        :aria-hidden="cpfProblem ? 'true' : undefined"
      >
        <AkSidebar />
        <div class="main-section">
          <AkHeader />
          <div class="main-content">
            <RouterView v-if="!cpfProblem" />
          </div>
        </div>
      </div>
      <AkCpfProblemModal v-if="cpfProblem" />
    </template>
  </template>
  <div v-else-if="status === 'error'" class="app-message">
    <span class="text-muted">{{ error }}</span>
    <AkButton type="button" @click="accountStore.load()">Tentar novamente</AkButton>
  </div>
</template>

<style lang="css" scoped>
.akpedia-page {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
}
.main-section {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.main-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.app-message {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-4);
  padding: var(--spacing-10);
  text-align: center;
}
</style>
