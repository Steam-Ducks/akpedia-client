<script setup lang="ts">
import { CircleAlert, CircleCheckBig, Search, UserPlus } from '@lucide/vue'
import AkEditUserDialog from '@/components/AkEditUserDialog.vue'
import AkProfileRequestsPanel from '@/components/AkProfileRequestsPanel.vue'
import {
  createUser,
  fetchAdminUsers,
  fetchRoles,
  updateUserRoles,
  updateUserStatus,
} from '@/services/admin-users'
import { sessionUser } from '@/services/auth'
import { useProfileRequestsStore } from '@/stores/profile-requests-store'
import { SECTORS } from '@/types/AdminUser'
import type { AdminUser, NewUser, Role, RoleName } from '@/types/AdminUser'
import { confirmAction } from '@/utils/confirm'
import { cpfProblem } from '@/utils/cpf'

definePage({ meta: { roles: ['ADMIN'] } })

const PAGE_SIZE = 20
const SEARCH_DELAY_MS = 300

const users = ref<AdminUser[]>([])
const page = ref(0)
const totalPages = ref(0)
const status = ref<'loading' | 'done' | 'error'>('loading')
const loadError = ref<string | null>(null)

const search = ref('')
const sectorFilter = ref('')
const roleFilter = ref<RoleName | ''>('')

const route = useRoute()
const profileRequests = useProfileRequestsStore()

/**
 * "Usuários" or the e-mail/CPF change requests waiting for a decision. `?tab=requests` (the
 * sidebar's link while some wait) opens on the requests.
 */
const tabFromQuery = (): 'users' | 'requests' =>
  route.query.tab === 'requests' ? 'requests' : 'users'
const tab = ref<'users' | 'requests'>(tabFromQuery())
watch(
  () => route.query.tab,
  () => (tab.value = tabFromQuery()),
)
const pendingCount = ref<number | null>(null)

/** The panel counted the pending requests: the sidebar's badge follows. */
const onPendingCount = (count: number) => {
  pendingCount.value = count
  profileRequests.setPendingCount(count)
}

/** The user whose data is open in the edit dialog. */
const editingUser = ref<AdminUser | null>(null)

const roles = ref<Role[]>([])
const rolesError = ref<string | null>(null)

/** The row whose roles are being edited, and the assignable roles ticked there. */
const editingId = ref<string | null>(null)
const selectedRoles = ref<string[]>([])

/** The row with a request in flight, so its buttons wait. */
const busyId = ref<string | null>(null)
const actionError = ref<string | null>(null)
const actionSuccess = ref<string | null>(null)

/** The "Novo usuário" form, closed until asked for. */
const creating = ref(false)
const saving = ref(false)
const createError = ref<string | null>(null)
const emptyNewUser = (): NewUser => ({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  cpf: '',
  sector: '',
  roles: [],
})
const newUser = ref<NewUser>(emptyNewUser())

const newCpfError = computed(() =>
  newUser.value.cpf === '' ? null : cpfProblem(newUser.value.cpf),
)
const canCreate = computed(() => {
  const user = newUser.value
  return (
    !saving.value &&
    [user.firstName, user.lastName, user.email, user.sector].every((field) => field.trim()) &&
    user.password !== '' &&
    user.cpf !== '' &&
    !newCpfError.value
  )
})

const assignableRoles = computed(() => roles.value.filter((role) => role.assignable))
const fixedRoles = computed(() => roles.value.filter((role) => !role.assignable))

const roleLabel = (name: string) => roles.value.find((role) => role.name === name)?.label ?? name

/** The server refuses these on one's own account; the screen says so up front. */
const isSelf = (user: AdminUser) =>
  !!sessionUser.value?.email && sessionUser.value.email.toLowerCase() === user.email.toLowerCase()

const termsLabel = (user: AdminUser) => {
  if (user.currentTermsVersion === null) return 'Nenhuma versão publicada'
  if (user.termsAcceptedVersion === user.currentTermsVersion) {
    return `Aceitou a versão ${user.termsAcceptedVersion}`
  }
  if (user.termsAcceptedVersion !== null) {
    return `Pendente (aceitou a versão ${user.termsAcceptedVersion})`
  }
  return 'Pendente'
}

const termsAccepted = (user: AdminUser) =>
  user.currentTermsVersion === null || user.termsAcceptedVersion === user.currentTermsVersion

/** Guards against an older, slower request overwriting the result of a newer one. */
let latestRequest = 0

const load = async () => {
  const request = ++latestRequest
  status.value = 'loading'
  loadError.value = null
  try {
    const result = await fetchAdminUsers({
      search: search.value,
      sector: sectorFilter.value,
      role: roleFilter.value,
      page: page.value,
      size: PAGE_SIZE,
    })
    if (request !== latestRequest) return
    users.value = result.content
    totalPages.value = result.totalPages
    status.value = 'done'
  } catch (e) {
    if (request !== latestRequest) return
    loadError.value = e instanceof Error ? e.message : 'Não foi possível carregar os usuários.'
    status.value = 'error'
  }
}

const loadRoles = async () => {
  try {
    roles.value = await fetchRoles()
  } catch (e) {
    rolesError.value = e instanceof Error ? e.message : 'Não foi possível carregar os papéis.'
  }
}

const changePage = (next: number) => {
  page.value = next
  load()
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 0
    load()
  }, SEARCH_DELAY_MS)
})

watch([sectorFilter, roleFilter], () => {
  page.value = 0
  load()
})

const replaceUser = (updated: AdminUser) => {
  users.value = users.value.map((user) => (user.id === updated.id ? updated : user))
}

const clearFeedback = () => {
  actionError.value = null
  actionSuccess.value = null
}

const startEditing = (user: AdminUser) => {
  clearFeedback()
  editingId.value = user.id
  selectedRoles.value = user.roles.filter((name) =>
    assignableRoles.value.some((role) => role.name === name),
  )
}

const cancelEditing = () => {
  editingId.value = null
}

/** One's own ADMIN cannot be removed: the box stays ticked and locked. */
const roleLocked = (user: AdminUser, role: Role) =>
  role.name === 'ADMIN' && isSelf(user) && user.roles.includes('ADMIN')

const saveRoles = async (user: AdminUser) => {
  const who = user.name || user.email
  const chosen = selectedRoles.value.map(roleLabel)
  const confirmed = await confirmAction({
    title: `Alterar os papéis de ${who}?`,
    text: chosen.length
      ? `A pessoa ficará com: ${chosen.join(', ')}, além do papel Padrão.`
      : 'A pessoa ficará só com o papel Padrão.',
    confirmText: 'Salvar papéis',
  })
  if (!confirmed) return

  clearFeedback()
  busyId.value = user.id
  try {
    const updated = await updateUserRoles(user.id, [...selectedRoles.value])
    replaceUser(updated)
    editingId.value = null
    actionSuccess.value = `Papéis de ${updated.name || updated.email} atualizados. A mudança vale a partir do próximo login ou renovação da sessão dele (até uns 5 minutos).`
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Não foi possível alterar os papéis.'
  } finally {
    busyId.value = null
  }
}

const toggleStatus = async (user: AdminUser) => {
  const who = user.name || user.email
  const confirmed = await confirmAction(
    user.enabled
      ? {
          title: `Desativar ${who}?`,
          text: 'A pessoa não conseguirá mais entrar no Akpedia.',
          confirmText: 'Desativar',
        }
      : {
          title: `Reativar ${who}?`,
          text: 'A pessoa voltará a conseguir entrar no Akpedia.',
          confirmText: 'Reativar',
        },
  )
  if (!confirmed) return

  clearFeedback()
  busyId.value = user.id
  try {
    const updated = await updateUserStatus(user.id, !user.enabled)
    replaceUser(updated)
    actionSuccess.value = updated.enabled ? `${who} foi reativado.` : `${who} foi desativado.`
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Não foi possível alterar o status.'
  } finally {
    busyId.value = null
  }
}

const openEdit = (user: AdminUser) => {
  clearFeedback()
  editingId.value = null
  editingUser.value = user
}

const userSaved = (updated: AdminUser) => {
  editingUser.value = null
  replaceUser(updated)
  actionSuccess.value = `Dados de ${updated.name || updated.email} salvos.`
}

const openCreate = () => {
  clearFeedback()
  createError.value = null
  newUser.value = emptyNewUser()
  creating.value = true
}

const closeCreate = () => {
  creating.value = false
}

const submitCreate = async () => {
  if (!canCreate.value) return
  saving.value = true
  createError.value = null
  clearFeedback()
  try {
    const created = await createUser({ ...newUser.value, roles: [...newUser.value.roles] })
    creating.value = false
    newUser.value = emptyNewUser()
    actionSuccess.value = `Conta de ${created.name || created.email} criada. A pessoa já pode entrar com o e-mail e a senha definidos.`
    load()
  } catch (e) {
    createError.value = e instanceof Error ? e.message : 'Não foi possível criar o usuário.'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadRoles()
  load()
})

onBeforeUnmount(() => clearTimeout(searchTimer))
</script>

<template>
  <main class="ak-admin-users">
    <div class="admin-header">
      <div class="text-title-large">Usuários</div>
      <div class="text-muted">
        Contas do Keycloak, com os papéis de cada uma e a situação dos termos de uso. Mudanças de
        papel valem a partir do próximo login ou renovação da sessão do usuário (até uns 5 minutos).
      </div>
    </div>

    <div class="admin-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        class="admin-tab tab-users"
        :class="{ active: tab === 'users' }"
        :aria-selected="tab === 'users'"
        @click="tab = 'users'"
      >
        Usuários
      </button>
      <button
        type="button"
        role="tab"
        class="admin-tab tab-requests"
        :class="{ active: tab === 'requests' }"
        :aria-selected="tab === 'requests'"
        @click="tab = 'requests'"
      >
        Solicitações
        <span v-if="pendingCount" class="tab-count" :aria-label="`${pendingCount} pendentes`">{{
          pendingCount
        }}</span>
      </button>
    </div>

    <AkProfileRequestsPanel
      v-show="tab === 'requests'"
      class="requests-tab"
      @count="onPendingCount"
      @approved="load"
    />

    <div v-show="tab === 'users'" class="users-tab">
      <div class="users-toolbar">
        <div class="users-filters">
          <AkInput v-model="search" class="users-search" placeholder="Buscar por nome ou e-mail">
            <template #pre><Search :size="19" aria-hidden="true" /></template>
          </AkInput>
          <AkSelect v-model="sectorFilter" class="filter-sector" aria-label="Filtrar por setor">
            <option value="">Todos os setores</option>
            <option v-for="sector in SECTORS" :key="sector" :value="sector">{{ sector }}</option>
          </AkSelect>
          <AkSelect v-model="roleFilter" class="filter-role" aria-label="Filtrar por papel">
            <option value="">Todos os papéis</option>
            <option value="STANDARD">Só Padrão</option>
            <option value="APPROVER">Aprovador</option>
            <option value="ADMIN">Administrador</option>
          </AkSelect>
        </div>
        <AkButton
          v-if="!creating"
          type="button"
          color="primary"
          class="new-user"
          @click="openCreate"
        >
          <UserPlus :size="19" />
          Novo usuário
        </AkButton>
      </div>

      <form v-if="creating" class="create-card" @submit.prevent="submitCreate">
        <div class="text-title-small">Novo usuário</div>
        <div class="create-grid">
          <label class="form-field">
            <span class="text-label-small">Nome</span>
            <AkInput v-model="newUser.firstName" class="new-first-name" />
          </label>
          <label class="form-field">
            <span class="text-label-small">Sobrenome</span>
            <AkInput v-model="newUser.lastName" class="new-last-name" />
          </label>
          <label class="form-field">
            <span class="text-label-small">E-mail</span>
            <AkInput v-model="newUser.email" type="email" class="new-email" />
          </label>
          <label class="form-field">
            <span class="text-label-small">Senha</span>
            <AkInput v-model="newUser.password" type="password" class="new-password" />
          </label>
          <label class="form-field">
            <span class="text-label-small">CPF</span>
            <AkInput v-model="newUser.cpf" class="new-cpf" placeholder="Somente números" />
            <span v-if="newCpfError" class="text-muted field-hint">{{ newCpfError }}</span>
          </label>
          <label class="form-field">
            <span class="text-label-small">Setor</span>
            <AkSelect v-model="newUser.sector" class="new-sector" required>
              <option value="" disabled>Escolha o setor</option>
              <option v-for="sector in SECTORS" :key="sector" :value="sector">{{ sector }}</option>
            </AkSelect>
          </label>
        </div>
        <fieldset class="create-roles">
          <legend class="text-label-small">Papéis</legend>
          <label v-for="role in fixedRoles" :key="role.name" class="role-option">
            <input type="checkbox" checked disabled />
            <span>{{ role.label }}</span>
            <span class="text-muted">(todos têm)</span>
          </label>
          <label v-for="role in assignableRoles" :key="role.name" class="role-option">
            <input v-model="newUser.roles" type="checkbox" :value="role.name" :name="role.name" />
            <span>{{ role.label }}</span>
          </label>
        </fieldset>
        <div class="text-muted">
          A senha é definitiva: passe-a à pessoa por um canal seguro. Ela pode trocá-la depois no
          Keycloak.
        </div>
        <div v-if="createError" class="admin-feedback admin-feedback--error" role="alert">
          <CircleAlert :size="19" />
          <span>{{ createError }}</span>
        </div>
        <div class="roles-editor-actions create-actions">
          <AkButton type="button" class="row-action" :disabled="saving" @click="closeCreate">
            Cancelar
          </AkButton>
          <AkButton
            type="submit"
            color="primary"
            class="row-action create-user"
            :disabled="!canCreate"
          >
            {{ saving ? 'Criando…' : 'Criar usuário' }}
          </AkButton>
        </div>
      </form>

      <div v-if="actionError" class="admin-feedback admin-feedback--error" role="alert">
        <CircleAlert :size="19" />
        <span>{{ actionError }}</span>
      </div>
      <div v-if="actionSuccess" class="admin-feedback admin-feedback--success" role="status">
        <CircleCheckBig :size="19" />
        <span>{{ actionSuccess }}</span>
      </div>

      <div v-if="status === 'loading' && users.length === 0" class="text-muted">
        Carregando os usuários…
      </div>
      <div v-else-if="status === 'error'" class="admin-feedback admin-feedback--error">
        <CircleAlert :size="19" />
        <span>{{ loadError }}</span>
      </div>
      <div v-else-if="users.length === 0" class="text-muted">Nenhum usuário encontrado.</div>

      <template v-else>
        <div class="table-wrapper">
          <table class="users-table">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">E-mail</th>
                <th scope="col">Setor</th>
                <th scope="col">Papéis</th>
                <th scope="col">Termos</th>
                <th scope="col">Status</th>
                <th scope="col"><span class="visually-hidden">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              <template v-for="user in users" :key="user.id">
                <tr class="user-row" :data-user-id="user.id">
                  <td>
                    <span class="text-bold">{{ user.name || '—' }}</span>
                    <span v-if="isSelf(user)" class="text-muted"> (você)</span>
                  </td>
                  <td>{{ user.email }}</td>
                  <td>{{ user.sector ?? '—' }}</td>
                  <td>
                    <div class="badge-list">
                      <span v-for="name in user.roles" :key="name" class="badge badge--role">
                        {{ roleLabel(name) }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span class="badge" :class="termsAccepted(user) ? 'badge--ok' : 'badge--alert'">
                      {{ termsLabel(user) }}
                    </span>
                  </td>
                  <td>
                    <AkStatusChip :status="user.enabled ? 'ACTIVE' : 'DISABLED'" />
                  </td>
                  <td>
                    <div class="row-actions">
                      <AkButton
                        type="button"
                        class="row-action edit-user"
                        :disabled="busyId === user.id"
                        @click="openEdit(user)"
                      >
                        Editar
                      </AkButton>
                      <AkButton
                        type="button"
                        class="row-action edit-roles"
                        :disabled="busyId === user.id || assignableRoles.length === 0"
                        @click="editingId === user.id ? cancelEditing() : startEditing(user)"
                      >
                        Editar papéis
                      </AkButton>
                      <AkButton
                        type="button"
                        class="row-action toggle-status"
                        :disabled="busyId === user.id || isSelf(user)"
                        :title="isSelf(user) ? 'Você não pode desativar a sua própria conta.' : ''"
                        @click="toggleStatus(user)"
                      >
                        {{ user.enabled ? 'Desativar' : 'Reativar' }}
                      </AkButton>
                    </div>
                  </td>
                </tr>
                <tr v-if="editingId === user.id" class="roles-editor-row">
                  <td colspan="7">
                    <form class="roles-editor" @submit.prevent="saveRoles(user)">
                      <fieldset>
                        <legend class="text-label-small">
                          Papéis de {{ user.name || user.email }}
                        </legend>
                        <label v-for="role in fixedRoles" :key="role.name" class="role-option">
                          <input type="checkbox" checked disabled />
                          <span>{{ role.label }}</span>
                          <span class="text-muted">(todos têm)</span>
                        </label>
                        <label v-for="role in assignableRoles" :key="role.name" class="role-option">
                          <input
                            v-model="selectedRoles"
                            type="checkbox"
                            :value="role.name"
                            :name="role.name"
                            :disabled="roleLocked(user, role)"
                          />
                          <span>{{ role.label }}</span>
                          <span v-if="roleLocked(user, role)" class="text-muted">
                            (você não pode remover o seu próprio)
                          </span>
                        </label>
                      </fieldset>
                      <div class="roles-editor-actions">
                        <AkButton type="button" class="row-action" @click="cancelEditing">
                          Cancelar
                        </AkButton>
                        <AkButton
                          type="submit"
                          color="primary"
                          class="row-action"
                          :disabled="busyId === user.id"
                        >
                          {{ busyId === user.id ? 'Salvando…' : 'Salvar papéis' }}
                        </AkButton>
                      </div>
                    </form>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <AkPaginator :page="page" :total-pages="totalPages" @change="changePage" />
      </template>

      <section class="roles-panel">
        <div class="text-title-small">Papéis e permissões</div>
        <div class="text-muted">
          As permissões de cada papel são fixas. O papel Padrão vem com toda conta; Aprovador e
          Administrador são atribuídos aqui.
        </div>
        <div v-if="rolesError" class="admin-feedback admin-feedback--error">
          <CircleAlert :size="19" />
          <span>{{ rolesError }}</span>
        </div>
        <div class="roles-list">
          <div v-for="role in roles" :key="role.name" class="role-card">
            <div class="text-bold">{{ role.label }}</div>
            <div v-if="role.description" class="text-muted">{{ role.description }}</div>
            <ul class="permission-list">
              <li v-for="permission in role.permissions" :key="permission">{{ permission }}</li>
            </ul>
          </div>
        </div>
      </section>
    </div>

    <AkEditUserDialog
      v-if="editingUser"
      :user="editingUser"
      @cancel="editingUser = null"
      @saved="userSaved"
    />
  </main>
</template>

<style scoped>
.ak-admin-users {
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
.admin-tabs {
  display: flex;
  gap: var(--spacing-2);
  border-bottom: 1px solid var(--color-border);
}
.admin-tab {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-3) var(--spacing-4);
  margin-bottom: -1px;
  border-bottom: 3px solid transparent;
  font-weight: 700;
  color: var(--color-text-muted);
  cursor: pointer;
}
.admin-tab:hover {
  color: var(--color-text);
}
.admin-tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}
.tab-count {
  min-width: 1.5rem;
  padding: 0 var(--spacing-2);
  border-radius: var(--round-pill);
  font-size: var(--font-sm);
  line-height: 1.5rem;
  text-align: center;
  color: var(--color-white);
  background-color: var(--color-wine);
}
.users-tab {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-6);
}
.users-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-4);
}
.users-filters {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-3);
}
.users-search {
  flex: 1;
  min-width: 240px;
  max-width: 480px;
}
.filter-sector,
.filter-role {
  min-width: 180px;
}
.create-card {
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
.create-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--spacing-4);
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}
.field-hint {
  font-size: var(--font-sm);
}
.create-roles {
  border: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-5);
}
.create-roles legend {
  margin-bottom: var(--spacing-3);
}
.create-actions {
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
.table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  background-color: var(--color-white);
}
.users-table {
  width: 100%;
  border-collapse: collapse;
}
.users-table th,
.users-table td {
  padding: var(--spacing-3) var(--spacing-4);
  text-align: left;
  vertical-align: middle;
  border-bottom: 1px solid var(--color-border);
}
.users-table th {
  font-size: var(--font-sm);
  font-weight: 700;
  color: var(--color-text-muted);
  white-space: nowrap;
}
.users-table tbody tr:last-child td {
  border-bottom: none;
}
.badge-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1);
}
.badge {
  display: inline-flex;
  align-items: center;
  font-size: var(--font-sm);
  font-weight: 700;
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--round-lg);
  white-space: nowrap;
}
.badge--role,
.badge--ok {
  color: var(--color-primary);
  background-color: var(--color-primary-selected);
}
.badge--alert {
  color: var(--color-white);
  background-color: var(--color-text);
}
.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-2);
}
.row-action {
  padding: var(--spacing-2) var(--spacing-3);
  font-size: var(--font-sm);
  white-space: nowrap;
}
.row-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.roles-editor-row td {
  background-color: var(--color-foreground);
}
.roles-editor {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-4);
}
.roles-editor fieldset {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-5);
}
.roles-editor legend {
  margin-bottom: var(--spacing-3);
}
.role-option {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-2);
}
.roles-editor-actions {
  display: flex;
  gap: var(--spacing-2);
}
.roles-panel {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}
.roles-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--spacing-4);
}
.role-card {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  padding: var(--spacing-5);
  border: 1px solid var(--color-border);
  border-radius: var(--round-lg);
  background-color: var(--color-white);
}
.permission-list {
  list-style: disc;
  padding-left: var(--spacing-5);
  line-height: 1.5;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
