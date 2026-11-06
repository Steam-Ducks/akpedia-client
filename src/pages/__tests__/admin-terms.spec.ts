import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AdminTermsPage from '../admin/terms.vue'
import { fetchTerms, fetchTermsVersions, publishTerms } from '@/services/terms'
import type { TermsVersion } from '@/types/Terms'

vi.mock('@/services/terms', () => ({
  fetchTerms: vi.fn(),
  fetchTermsVersions: vi.fn(),
  publishTerms: vi.fn(),
  acceptTerms: vi.fn(),
  TermsChangedError: class extends Error {},
}))

const version = (number: number, content = `Texto da versão ${number}.`): TermsVersion => ({
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

describe('admin terms page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('explains that nothing has to be accepted while no version was published', async () => {
    vi.mocked(fetchTermsVersions).mockResolvedValue([])

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Nenhuma versão publicada ainda')
    expect(wrapper.text()).toContain('Publicar como versão 1')
  })

  it('starts the form from the current version and lists every version', async () => {
    vi.mocked(fetchTermsVersions).mockResolvedValue([version(2, 'Texto atual.'), version(1)])

    const wrapper = await mountPage()

    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Texto atual.')
    expect(wrapper.text()).toContain('Publicar como versão 3')
    expect(wrapper.text()).toContain('Versão 2 — Termos de uso')
    expect(wrapper.text()).toContain('Versão 1 — Termos de uso')
  })

  it('publishes after confirmation and brings up the terms screen', async () => {
    vi.mocked(fetchTermsVersions).mockResolvedValue([version(1)])
    vi.mocked(publishTerms).mockResolvedValue(version(2, 'Novo texto.'))
    vi.mocked(fetchTerms).mockResolvedValue({ current: version(2), accepted: null })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = await mountPage()

    await wrapper.get('textarea').setValue('Novo texto.')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('nova versão'))
    expect(publishTerms).toHaveBeenCalledWith({ title: 'Termos de uso', content: 'Novo texto.' })
    expect(fetchTerms).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Versão 2 publicada.')
  })

  it('does not publish when the admin cancels', async () => {
    vi.mocked(fetchTermsVersions).mockResolvedValue([version(1)])
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = await mountPage()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(publishTerms).not.toHaveBeenCalled()
  })

  it('does not publish an empty text', async () => {
    vi.mocked(fetchTermsVersions).mockResolvedValue([])
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = await mountPage()

    await wrapper.get('form').trigger('submit')

    expect(confirm).not.toHaveBeenCalled()
    expect(publishTerms).not.toHaveBeenCalled()
  })
})
