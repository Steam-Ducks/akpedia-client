import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import BreachNoticesPage from '../admin/breach-notices.vue'
import {
  fetchBreachNoticeTemplate,
  previewBreachNotice,
  sendBreachNotice,
} from '@/services/breach-notices'
import { fetchAdminUsers } from '@/services/admin-users'
import type { AdminUser } from '@/types/AdminUser'
import { confirmAction } from '@/utils/confirm'

vi.mock('@/utils/confirm', () => ({ confirmAction: vi.fn() }))
vi.mock('@/services/breach-notices', () => ({
  fetchBreachNoticeTemplate: vi.fn(),
  previewBreachNotice: vi.fn(),
  sendBreachNotice: vi.fn(),
}))
vi.mock('@/services/admin-users', () => ({ fetchAdminUsers: vi.fn() }))

const template = {
  subject: 'Aviso importante',
  body: 'Olá {{nome_titular}}, em {{data_descoberta}}.',
  fields: [
    {
      name: 'nome_titular',
      required: true,
      automatic: true,
      description: 'Nome do titular',
      example: 'Ana',
    },
    {
      name: 'data_descoberta',
      required: true,
      automatic: false,
      description: 'Data da descoberta',
      example: '10/11/2026',
    },
    {
      name: 'nome_encarregado',
      required: false,
      automatic: false,
      description: 'Encarregado',
      example: 'Maria',
    },
  ],
}

const user = (id: string, name: string, enabled = true): AdminUser => ({
  id,
  name,
  email: `${name.toLowerCase()}@akaer.com.br`,
  sector: 'Engenharia',
  cpf: null,
  firstName: name,
  lastName: '',
  enabled,
  roles: ['STANDARD'],
  termsAcceptedVersion: null,
  currentTermsVersion: null,
  createdAt: null,
})

const page = (content: AdminUser[]) => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: 1,
})

const mountPage = async () => {
  const wrapper = mount(BreachNoticesPage)
  await flushPromises()
  return wrapper
}

type Wrapper = Awaited<ReturnType<typeof mountPage>>

const fillRequired = async (wrapper: Wrapper) => {
  await wrapper.get('.field-data_descoberta input').setValue('10/11/2026')
}

const sendButton = (wrapper: Wrapper) => wrapper.get('button[type="submit"]')

describe('admin breach notices page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchBreachNoticeTemplate).mockResolvedValue(template)
    vi.mocked(fetchAdminUsers).mockResolvedValue(
      page([user('kc-1', 'Ana'), user('kc-2', 'Bruno', false)]) as never,
    )
    vi.mocked(confirmAction).mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts from the template and asks for every field but the automatic one', async () => {
    const wrapper = await mountPage()

    expect((wrapper.get('.notice-subject input').element as HTMLInputElement).value).toBe(
      'Aviso importante',
    )
    expect((wrapper.get('.notice-body textarea').element as HTMLTextAreaElement).value).toContain(
      '{{nome_titular}}',
    )
    expect(wrapper.find('.field-nome_titular').exists()).toBe(false)
    expect(wrapper.get('.field-data_descoberta input').attributes('placeholder')).toBe('10/11/2026')
    expect(wrapper.text()).toContain('Data da descoberta *')
    expect(wrapper.text()).not.toContain('Encarregado *')
  })

  it('keeps sending disabled until the ANPD is confirmed', async () => {
    const wrapper = await mountPage()
    await fillRequired(wrapper)

    expect(sendButton(wrapper).attributes('disabled')).toBeDefined()

    await wrapper.get('input.anpd').setValue(true)

    expect(sendButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('keeps sending disabled while a required field is blank', async () => {
    const wrapper = await mountPage()
    await wrapper.get('input.anpd').setValue(true)

    expect(sendButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('shows the e-mail as a recipient will read it', async () => {
    vi.mocked(previewBreachNotice).mockResolvedValue({
      subject: 'Aviso para Admin',
      body: 'Olá Admin.',
    })
    const wrapper = await mountPage()
    await fillRequired(wrapper)

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Pré-visualizar'))!
      .trigger('click')
    await flushPromises()

    expect(previewBreachNotice).toHaveBeenCalledWith(
      expect.objectContaining({ fields: { data_descoberta: '10/11/2026', nome_encarregado: '' } }),
    )
    expect(wrapper.get('.preview').text()).toContain('Aviso para Admin')
    expect(wrapper.get('.preview').text()).toContain('Olá Admin.')
  })

  it('confirms with the number of people, then sends to the ones picked by Keycloak id', async () => {
    vi.mocked(sendBreachNotice).mockResolvedValue({
      id: 5,
      total: 2,
      sent: 1,
      failed: 1,
      failures: [{ email: 'bruno@akaer.com.br', reason: 'REJECTED', error: 'REJECTED: 550' }],
    })
    const wrapper = await mountPage()
    await fillRequired(wrapper)
    await wrapper.get('input[value="selected"]').setValue(true)
    await flushPromises()
    const boxes = wrapper.findAll('.user-list input[type="checkbox"]')
    await boxes[0].setValue(true)
    await boxes[1].setValue(true)
    await wrapper.get('input.anpd').setValue(true)

    expect(wrapper.text()).toContain('Desativado')
    expect(wrapper.findAll('.chosen-chip')).toHaveLength(2)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(confirmAction).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('2 pessoas') }),
    )
    expect(sendBreachNotice).toHaveBeenCalledWith(
      expect.objectContaining({ recipients: ['kc-1', 'kc-2'] }),
    )
    expect(wrapper.text()).toContain('1 de 2 e-mails enviados; 1 falharam')
    expect(wrapper.text()).toContain('bruno@akaer.com.br: REJECTED: 550')
  })

  it('removes a chosen person with its chip', async () => {
    const wrapper = await mountPage()
    await wrapper.get('input[value="selected"]').setValue(true)
    await flushPromises()
    await wrapper.get('.user-list input[type="checkbox"]').setValue(true)

    await wrapper.get('.chip-remove').trigger('click')

    expect(wrapper.findAll('.chosen-chip')).toHaveLength(0)
  })

  it('needs at least one person when picking', async () => {
    const wrapper = await mountPage()
    await fillRequired(wrapper)
    await wrapper.get('input[value="selected"]').setValue(true)
    await wrapper.get('input.anpd').setValue(true)

    expect(sendButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('confirms with "todos os usuários" and sends to everyone', async () => {
    vi.mocked(sendBreachNotice).mockResolvedValue({
      id: 5,
      total: 3,
      sent: 3,
      failed: 0,
      failures: [],
    })
    const wrapper = await mountPage()
    await fillRequired(wrapper)
    await wrapper.get('input.anpd').setValue(true)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(confirmAction).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('todos os usuários') }),
    )
    expect(sendBreachNotice).toHaveBeenCalledWith(expect.objectContaining({ recipients: 'all' }))
    expect(wrapper.text()).toContain('3 de 3 e-mails enviados.')
  })

  it('does not send when the confirmation is cancelled', async () => {
    vi.mocked(confirmAction).mockResolvedValue(false)
    const wrapper = await mountPage()
    await fillRequired(wrapper)
    await wrapper.get('input.anpd').setValue(true)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(sendBreachNotice).not.toHaveBeenCalled()
  })

  it("shows the server's message and keeps what was typed when it refuses", async () => {
    vi.mocked(sendBreachNotice).mockRejectedValue(new Error('Contas sem usuario: kc-9.'))
    const wrapper = await mountPage()
    await fillRequired(wrapper)
    await wrapper.get('input.anpd').setValue(true)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('.send-error').text()).toContain('Contas sem usuario: kc-9.')
    expect((wrapper.get('.field-data_descoberta input').element as HTMLInputElement).value).toBe(
      '10/11/2026',
    )
  })

  it('shows the error when the template cannot be loaded', async () => {
    vi.mocked(fetchBreachNoticeTemplate).mockRejectedValue(new Error('Falhou'))

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Falhou')
    expect(wrapper.find('form').exists()).toBe(false)
  })
})
