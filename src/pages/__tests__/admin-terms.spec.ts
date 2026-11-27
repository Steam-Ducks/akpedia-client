import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AdminTermsPage from '../admin/terms.vue'
import {
  fetchTerms,
  fetchTermsHistory,
  fetchTermsHistoryEntry,
  fetchTermsVersions,
  publishTerms,
  TermsVersionExistsError,
} from '@/services/terms'
import type { TermsVersion } from '@/types/Terms'
import { confirmAction } from '@/utils/confirm'

vi.mock('@/utils/confirm', () => ({ confirmAction: vi.fn() }))

vi.mock('@/services/terms', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/terms')>()
  return {
    fetchTerms: vi.fn(),
    fetchTermsVersions: vi.fn(),
    fetchTermsHistory: vi.fn(),
    fetchTermsHistoryEntry: vi.fn(),
    publishTerms: vi.fn(),
    acceptTerms: vi.fn(),
    TermsChangedError: actual.TermsChangedError,
    TermsVersionExistsError: actual.TermsVersionExistsError,
    nextTermsVersion: actual.nextTermsVersion,
  }
})

const version = (number: string, content = `Texto da versão ${number}.`): TermsVersion => ({
  version: number,
  title: 'Termos de uso',
  content,
  publishedAt: new Date('2026-11-06T12:00:00'),
  publishedBy: 'Admin Akpedia',
  optionalPermissions: [],
})

const mountPage = async () => {
  const wrapper = mount(AdminTermsPage)
  await flushPromises()
  return wrapper
}

const submitButton = (wrapper: Awaited<ReturnType<typeof mountPage>>) =>
  wrapper.get('button[type="submit"]')

describe('admin terms page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(fetchTermsHistory).mockResolvedValue({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('explains that nothing has to be accepted while no version was published', async () => {
    vi.mocked(fetchTermsVersions).mockResolvedValue([])

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Nenhuma versão publicada ainda')
    expect(wrapper.get('.next-version').text()).toBe('1.0')
    expect(wrapper.text()).toContain('É a primeira versão.')
    expect(submitButton(wrapper).text()).toBe('Publicar versão 1.0')
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('starts the form from the current version and lists every version', async () => {
    vi.mocked(fetchTermsVersions).mockResolvedValue([
      version('2.0', 'Texto atual.'),
      version('1.0'),
    ])

    const wrapper = await mountPage()

    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Texto atual.')
    expect(wrapper.text()).toContain('A versão atual é 2.0.')
    expect(wrapper.text()).toContain('Versão 2.0 — Termos de uso')
    expect(wrapper.text()).toContain('Versão 1.0 — Termos de uso')
  })

  it('has no version field: it shows the next X.0, which names the button', async () => {
    vi.mocked(fetchTermsVersions).mockResolvedValue([version('9.0'), version('OI'), version('1.3')])

    const wrapper = await mountPage()

    expect(wrapper.find('.version-input').exists()).toBe(false)
    expect(wrapper.find('input[type="radio"]').exists()).toBe(false)
    expect(wrapper.get('.next-version').text()).toBe('10.0')
    expect(submitButton(wrapper).text()).toBe('Publicar versão 10.0')
    expect(submitButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('calls the newest published version current, whatever its number', async () => {
    vi.mocked(fetchTermsVersions).mockResolvedValue([version('9'), version('10')])

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('A versão atual é 9.')
    expect(wrapper.findAll('.version-item')[0].text()).toContain('Atual')
  })

  it('counts the versions and marks the newest one as current', async () => {
    vi.mocked(fetchTermsVersions).mockResolvedValue([version('2.0'), version('1.0')])

    const wrapper = await mountPage()

    expect(wrapper.get('.versions-count').text()).toBe('2')
    const items = wrapper.findAll('.version-item')
    expect(items[0].get('.current-chip').text()).toBe('Atual')
    expect(items[1].find('.current-chip').exists()).toBe(false)
  })

  it('on terms_version_exists, says so and catches up with the versions published meanwhile', async () => {
    vi.mocked(fetchTermsVersions)
      .mockResolvedValueOnce([version('1.0')])
      .mockResolvedValueOnce([version('2.0'), version('1.0')])
    vi.mocked(publishTerms).mockRejectedValue(
      new TermsVersionExistsError(
        'Já existe a versão 2.0. Recarregue a página e publique de novo.',
      ),
    )
    vi.mocked(confirmAction).mockResolvedValue(true)
    const wrapper = await mountPage()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('.admin-feedback--error').text()).toContain('Já existe a versão 2.0.')
    expect(wrapper.get('.next-version').text()).toBe('3.0')
    expect(submitButton(wrapper).text()).toBe('Publicar versão 3.0')
  })

  it('publishes after confirmation and brings up the terms screen', async () => {
    vi.mocked(fetchTermsVersions).mockResolvedValue([version('1.0')])
    vi.mocked(publishTerms).mockResolvedValue(version('2.0', 'Novo texto.'))
    vi.mocked(fetchTerms).mockResolvedValue({ current: version('2.0'), accepted: null })
    const confirm = vi.mocked(confirmAction).mockResolvedValue(true)
    const wrapper = await mountPage()

    await wrapper.get('textarea').setValue('Novo texto.')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Publicar a versão 2.0?', confirmText: 'Publicar' }),
    )
    expect(publishTerms).toHaveBeenCalledWith({
      title: 'Termos de uso',
      content: 'Novo texto.',
      optionalPermissions: [],
    })
    expect(fetchTerms).toHaveBeenCalled()
    expect(fetchTermsHistory).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Versão 2.0 publicada.')
    expect(wrapper.text()).toContain('A versão atual é 2.0.')
    expect(wrapper.get('.next-version').text()).toBe('3.0')
  })

  describe('history', () => {
    const entry = (
      id: number,
      name: string | null,
      email: string | null,
      action: 'accepted' | 'updated' | 'declined' = 'accepted',
    ) => ({
      action,
      id,
      version: '2.0',
      userId: id,
      userName: name,
      userEmail: email,
      at: new Date('2026-11-01T10:00:00'),
    })

    const acceptancePage = (content: ReturnType<typeof entry>[], totalPages = 1) => ({
      content,
      page: 0,
      size: 20,
      totalElements: content.length,
      totalPages,
    })

    it('lists who did what with which version, and when', async () => {
      vi.mocked(fetchTermsVersions).mockResolvedValue([version('2.0'), version('1.0')])
      vi.mocked(fetchTermsHistory).mockResolvedValue(
        acceptancePage([entry(1, 'Ana Souza', 'ana@akaer.com')]),
      )

      const wrapper = await mountPage()

      const row = wrapper.get('.acceptance-row')
      expect(row.text()).toContain('Ana Souza')
      expect(row.text()).toContain('ana@akaer.com')
      expect(row.text()).toContain('2.0')
      expect(row.text()).toContain('01/11/2026')
      expect(row.get('.action-tag').text()).toBe('Aceitou')
      expect(fetchTermsHistory).toHaveBeenCalledWith({
        version: '',
        user: '',
        page: 0,
        size: 20,
      })
    })

    it('shows the anonymized row of a deleted account as the server sends it', async () => {
      vi.mocked(fetchTermsVersions).mockResolvedValue([version('2.0')])
      vi.mocked(fetchTermsHistory).mockResolvedValue(
        acceptancePage([entry(1, 'Usuário removido', 'removido-1@anonimizado.invalid')]),
      )

      const wrapper = await mountPage()

      expect(wrapper.get('.acceptance-row').text()).toContain('Usuário removido')
      expect(wrapper.get('.acceptance-row').text()).toContain('removido-1@anonimizado.invalid')
    })

    it('says so when nobody accepted yet', async () => {
      vi.mocked(fetchTermsVersions).mockResolvedValue([version('2.0')])

      const wrapper = await mountPage()

      expect(wrapper.text()).toContain('Nenhum registro com esses filtros.')
    })

    it('names each action: accepted, updated, declined', async () => {
      vi.mocked(fetchTermsVersions).mockResolvedValue([version('2.0')])
      vi.mocked(fetchTermsHistory).mockResolvedValue(
        acceptancePage([
          entry(3, 'Ana Souza', 'ana@akaer.com', 'updated'),
          entry(2, 'Ana Souza', 'ana@akaer.com', 'accepted'),
          entry(2, 'Bia Lima', 'bia@akaer.com', 'declined'),
        ]),
      )

      const wrapper = await mountPage()

      expect(wrapper.findAll('.action-tag').map((t) => t.text())).toEqual([
        'Atualizou',
        'Aceitou',
        'Recusou',
      ])
    })

    it('opens the permissions of an entry, before and after it, and closes them', async () => {
      vi.mocked(fetchTermsVersions).mockResolvedValue([version('2.0')])
      vi.mocked(fetchTermsHistory).mockResolvedValue(
        acceptancePage([entry(9, 'Ana Souza', 'ana@akaer.com', 'updated')]),
      )
      vi.mocked(fetchTermsHistoryEntry).mockResolvedValue({
        action: 'updated',
        id: 9,
        version: '2.0',
        userName: 'Ana Souza',
        userEmail: 'ana@akaer.com',
        at: new Date('2026-11-01T10:00:00'),
        permissions: [
          {
            id: 'newsletter',
            label: 'Newsletter',
            description: 'E-mails sobre novidades',
            grantedBefore: true,
            grantedAfter: false,
            changed: true,
          },
          {
            id: 'analise',
            label: 'Análise de uso',
            description: 'Métricas de uso',
            grantedBefore: null,
            grantedAfter: null,
            changed: false,
          },
        ],
      })
      const wrapper = await mountPage()

      await wrapper.get('.open-permissions').trigger('click')
      await flushPromises()

      expect(fetchTermsHistoryEntry).toHaveBeenCalledWith('updated', 9)
      const rows = wrapper.findAll('.permission-row')
      expect(rows[0].text()).toContain('alterada')
      expect(rows[0].get('.permission-before').text()).toBe('Permitida')
      expect(rows[0].get('.permission-after').text()).toBe('Não permitida')
      // Taken back: the new status in red.
      expect(rows[0].get('.permission-after .status').classes()).toContain('status--revoked')
      expect(rows[1].get('.permission-before').text()).toBe('—')
      expect(rows[1].get('.permission-after .status').classes()).not.toContain('status--revoked')

      await wrapper.get('.dialog-close').trigger('click')
      expect(wrapper.find('.permission-row').exists()).toBe(false)
    })

    it('reports a failed load of an entry inside the dialog', async () => {
      vi.mocked(fetchTermsVersions).mockResolvedValue([version('2.0')])
      vi.mocked(fetchTermsHistory).mockResolvedValue(
        acceptancePage([entry(4, 'Bia Lima', 'bia@akaer.com', 'declined')]),
      )
      vi.mocked(fetchTermsHistoryEntry).mockRejectedValue(new Error('Registro não encontrado.'))
      const wrapper = await mountPage()

      await wrapper.get('.open-permissions').trigger('click')
      await flushPromises()

      expect(wrapper.get('[role="dialog"]').text()).toContain('Registro não encontrado.')
    })

    it('filters by version and employee, going back to the first page', async () => {
      vi.mocked(fetchTermsVersions).mockResolvedValue([version('2.0'), version('1.0')])
      vi.mocked(fetchTermsHistory).mockResolvedValue(
        acceptancePage([entry(1, 'Ana Souza', 'ana@akaer.com')], 3),
      )
      const wrapper = await mountPage()
      await wrapper.get('.ak-paginator button:last-child').trigger('click')
      await flushPromises()
      expect(fetchTermsHistory).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }))

      vi.useFakeTimers()
      await wrapper.get('.filter-version select').setValue('1.0')
      await wrapper.get('.filter-user input').setValue('ana')
      await vi.advanceTimersByTimeAsync(300)
      vi.useRealTimers()

      expect(fetchTermsHistory).toHaveBeenLastCalledWith({
        version: '1.0',
        user: 'ana',
        page: 0,
        size: 20,
      })
    })

    it('reports a failed load', async () => {
      vi.mocked(fetchTermsVersions).mockResolvedValue([version('2.0')])
      vi.mocked(fetchTermsHistory).mockRejectedValue(new Error('Falhou.'))

      const wrapper = await mountPage()

      expect(wrapper.text()).toContain('Falhou.')
    })
  })

  it('does not publish when the admin cancels', async () => {
    vi.mocked(fetchTermsVersions).mockResolvedValue([version('1.0')])
    vi.mocked(confirmAction).mockResolvedValue(false)
    const wrapper = await mountPage()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(publishTerms).not.toHaveBeenCalled()
  })

  it('does not publish without a title or a text', async () => {
    vi.mocked(fetchTermsVersions).mockResolvedValue([])
    const confirm = vi.mocked(confirmAction).mockResolvedValue(true)
    const wrapper = await mountPage()

    await wrapper.get('form').trigger('submit')
    await wrapper.get('textarea').setValue('Texto.')
    await wrapper.findAll('form input')[0].setValue('  ')
    await wrapper.get('form').trigger('submit')

    expect(confirm).not.toHaveBeenCalled()
    expect(publishTerms).not.toHaveBeenCalled()
  })
})
