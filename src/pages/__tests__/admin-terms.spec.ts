import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AdminTermsPage from '../admin/terms.vue'
import {
  fetchTerms,
  fetchTermsAcceptances,
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
    fetchTermsAcceptances: vi.fn(),
    publishTerms: vi.fn(),
    acceptTerms: vi.fn(),
    TermsChangedError: actual.TermsChangedError,
    TermsVersionExistsError: actual.TermsVersionExistsError,
    TERMS_VERSION_PATTERN: actual.TERMS_VERSION_PATTERN,
    sameTermsVersion: actual.sameTermsVersion,
  }
})

const version = (number: string, content = `Texto da versão ${number}.`): TermsVersion => ({
  version: number,
  title: 'Termos de uso',
  content,
  publishedAt: new Date('2026-11-06T12:00:00'),
  publishedBy: 'Admin Akpedia',
})

const mountPage = async () => {
  const wrapper = mount(AdminTermsPage)
  await flushPromises()
  return wrapper
}

/** The first input of the form is the version; the title comes after it. */
const versionInput = (wrapper: Awaited<ReturnType<typeof mountPage>>) =>
  wrapper.get('.version-input input')

const submitButton = (wrapper: Awaited<ReturnType<typeof mountPage>>) =>
  wrapper.get('button[type="submit"]')

describe('admin terms page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(fetchTermsAcceptances).mockResolvedValue({
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
    expect(wrapper.text()).toContain('Primeira versão: por exemplo 1.0.')
    expect(submitButton(wrapper).text()).toBe('Publicar versão')
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('starts the form from the current version and lists every version', async () => {
    vi.mocked(fetchTermsVersions).mockResolvedValue([
      version('2.0', 'Texto atual.'),
      version('1.0'),
    ])

    const wrapper = await mountPage()

    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Texto atual.')
    expect((versionInput(wrapper).element as HTMLInputElement).value).toBe('')
    expect(wrapper.text()).toContain('A versão atual é 2.0. Use um número novo.')
    expect(wrapper.text()).toContain('Versão 2.0 — Termos de uso')
    expect(wrapper.text()).toContain('Versão 1.0 — Termos de uso')
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

  it('names the button after the typed version', async () => {
    vi.mocked(fetchTermsVersions).mockResolvedValue([version('1.0')])
    const wrapper = await mountPage()

    await versionInput(wrapper).setValue('  2.1 ')

    expect(submitButton(wrapper).text()).toBe('Publicar versão 2.1')
    expect(submitButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('refuses a version out of format, inline', async () => {
    vi.mocked(fetchTermsVersions).mockResolvedValue([version('1.0')])
    const confirm = vi.mocked(confirmAction).mockResolvedValue(true)
    const wrapper = await mountPage()

    await versionInput(wrapper).setValue('2 0')

    expect(wrapper.get('.field-error').text()).toBe(
      'Use até 20 caracteres: letras, números, ponto, hífen ou sublinhado.',
    )
    expect(wrapper.find('.version-input--invalid').exists()).toBe(true)
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined()

    await versionInput(wrapper).setValue('x'.repeat(21))
    expect(wrapper.find('.field-error').exists()).toBe(true)

    await wrapper.get('form').trigger('submit')
    expect(confirm).not.toHaveBeenCalled()
    expect(publishTerms).not.toHaveBeenCalled()
  })

  it('refuses any earlier version, in any case, not only the current one', async () => {
    vi.mocked(fetchTermsVersions).mockResolvedValue([version('2.0'), version('v1.0')])
    const wrapper = await mountPage()

    await versionInput(wrapper).setValue(' V1.0 ')

    expect(wrapper.get('.field-error').text()).toBe(
      'Já existe a versão v1.0. Use um número de versão novo.',
    )
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('shows the server’s terms_version_exists under the field, until the version changes', async () => {
    vi.mocked(fetchTermsVersions).mockResolvedValue([version('1.0')])
    vi.mocked(publishTerms).mockRejectedValue(
      new TermsVersionExistsError('Já existe a versão 3.0. Use um número de versão novo.'),
    )
    vi.mocked(confirmAction).mockResolvedValue(true)
    const wrapper = await mountPage()

    await versionInput(wrapper).setValue('3.0')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('.field-error').text()).toBe(
      'Já existe a versão 3.0. Use um número de versão novo.',
    )
    expect(wrapper.find('.admin-feedback--error').exists()).toBe(false)

    await versionInput(wrapper).setValue('3.1')
    expect(wrapper.find('.field-error').exists()).toBe(false)
  })

  it('publishes after confirmation and brings up the terms screen', async () => {
    vi.mocked(fetchTermsVersions).mockResolvedValue([version('1.0')])
    vi.mocked(publishTerms).mockResolvedValue(version('2026.1', 'Novo texto.'))
    vi.mocked(fetchTerms).mockResolvedValue({ current: version('2026.1'), accepted: null })
    const confirm = vi.mocked(confirmAction).mockResolvedValue(true)
    const wrapper = await mountPage()

    await versionInput(wrapper).setValue(' 2026.1 ')
    await wrapper.get('textarea').setValue('Novo texto.')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Publicar a versão 2026.1?', confirmText: 'Publicar' }),
    )
    expect(publishTerms).toHaveBeenCalledWith({
      version: '2026.1',
      title: 'Termos de uso',
      content: 'Novo texto.',
    })
    expect(fetchTerms).toHaveBeenCalled()
    expect(fetchTermsAcceptances).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('Versão 2026.1 publicada.')
    expect(wrapper.text()).toContain('A versão atual é 2026.1.')
    expect((versionInput(wrapper).element as HTMLInputElement).value).toBe('')
  })

  describe('acceptances', () => {
    const entry = (id: number, name: string | null, email: string | null, versionName = '2.0') => ({
      id,
      version: versionName,
      userId: id,
      userName: name,
      userEmail: email,
      acceptedAt: new Date('2026-11-01T10:00:00'),
    })

    const acceptancePage = (content: ReturnType<typeof entry>[], totalPages = 1) => ({
      content,
      page: 0,
      size: 20,
      totalElements: content.length,
      totalPages,
    })

    it('lists who accepted which version, and when', async () => {
      vi.mocked(fetchTermsVersions).mockResolvedValue([version('2.0'), version('1.0')])
      vi.mocked(fetchTermsAcceptances).mockResolvedValue(
        acceptancePage([entry(1, 'Ana Souza', 'ana@akaer.com')]),
      )

      const wrapper = await mountPage()

      const row = wrapper.get('.acceptance-row')
      expect(row.text()).toContain('Ana Souza')
      expect(row.text()).toContain('ana@akaer.com')
      expect(row.text()).toContain('2.0')
      expect(row.text()).toContain('01/11/2026')
      expect(fetchTermsAcceptances).toHaveBeenCalledWith({
        version: '',
        user: '',
        page: 0,
        size: 20,
      })
    })

    it('shows the anonymized row of a deleted account as the server sends it', async () => {
      vi.mocked(fetchTermsVersions).mockResolvedValue([version('2.0')])
      vi.mocked(fetchTermsAcceptances).mockResolvedValue(
        acceptancePage([entry(1, 'Usuário removido', 'removido-1@anonimizado.invalid')]),
      )

      const wrapper = await mountPage()

      expect(wrapper.get('.acceptance-row').text()).toContain('Usuário removido')
      expect(wrapper.get('.acceptance-row').text()).toContain('removido-1@anonimizado.invalid')
    })

    it('says so when nobody accepted yet', async () => {
      vi.mocked(fetchTermsVersions).mockResolvedValue([version('2.0')])

      const wrapper = await mountPage()

      expect(wrapper.text()).toContain('Nenhum aceite com esses filtros.')
    })

    it('filters by version and employee, going back to the first page', async () => {
      vi.mocked(fetchTermsVersions).mockResolvedValue([version('2.0'), version('1.0')])
      vi.mocked(fetchTermsAcceptances).mockResolvedValue(
        acceptancePage([entry(1, 'Ana Souza', 'ana@akaer.com')], 3),
      )
      const wrapper = await mountPage()
      await wrapper.get('.ak-paginator button:last-child').trigger('click')
      await flushPromises()
      expect(fetchTermsAcceptances).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }))

      vi.useFakeTimers()
      await wrapper.get('.filter-version select').setValue('1.0')
      await wrapper.get('.filter-user input').setValue('ana')
      await vi.advanceTimersByTimeAsync(300)
      vi.useRealTimers()

      expect(fetchTermsAcceptances).toHaveBeenLastCalledWith({
        version: '1.0',
        user: 'ana',
        page: 0,
        size: 20,
      })
    })

    it('reports a failed load', async () => {
      vi.mocked(fetchTermsVersions).mockResolvedValue([version('2.0')])
      vi.mocked(fetchTermsAcceptances).mockRejectedValue(new Error('Falhou.'))

      const wrapper = await mountPage()

      expect(wrapper.text()).toContain('Falhou.')
    })
  })

  it('does not publish when the admin cancels', async () => {
    vi.mocked(fetchTermsVersions).mockResolvedValue([version('1.0')])
    vi.mocked(confirmAction).mockResolvedValue(false)
    const wrapper = await mountPage()

    await versionInput(wrapper).setValue('2.0')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(publishTerms).not.toHaveBeenCalled()
  })

  it('does not publish without a version or a text', async () => {
    vi.mocked(fetchTermsVersions).mockResolvedValue([])
    const confirm = vi.mocked(confirmAction).mockResolvedValue(true)
    const wrapper = await mountPage()

    await wrapper.get('form').trigger('submit')
    await versionInput(wrapper).setValue('1.0')
    await wrapper.get('form').trigger('submit')

    expect(confirm).not.toHaveBeenCalled()
    expect(publishTerms).not.toHaveBeenCalled()
  })
})
