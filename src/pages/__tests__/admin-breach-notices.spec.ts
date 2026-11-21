import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import BreachNoticesPage from '../admin/breach-notices.vue'
import AkDatePicker from '@/components/design-system/AkDatePicker.vue'
import {
  fetchBreachNotices,
  fetchBreachNoticeTemplate,
  previewBreachNotice,
  sendBreachNotice,
} from '@/services/breach-notices'
import { fetchAdminUsers } from '@/services/admin-users'
import type { AdminUser } from '@/types/AdminUser'
import { confirmAction } from '@/utils/confirm'

vi.mock('@/utils/confirm', () => ({ confirmAction: vi.fn() }))
vi.mock('@/services/breach-notices', () => ({
  fetchBreachNotices: vi.fn(),
  fetchBreachNotice: vi.fn(),
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
      type: 'TEXT' as const,
      description: 'Nome do titular',
      example: 'Ana',
    },
    {
      name: 'data_descoberta',
      required: true,
      automatic: false,
      type: 'DATE' as const,
      description: 'Data da descoberta',
      example: '2026-11-10',
    },
    {
      name: 'data_incidente',
      required: false,
      automatic: false,
      type: 'DATE_RANGE' as const,
      description: 'Período do incidente',
      example: '2026-11-08/2026-11-09',
    },
    {
      name: 'dados_afetados',
      required: false,
      automatic: false,
      type: 'MULTILINE' as const,
      description: 'Dados afetados, um por linha',
      example: 'Nome\nE-mail',
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

const EMPTY_FIELDS = { data_incidente: '', dados_afetados: '', nome_encarregado: '' }

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

const setDate = async (wrapper: Wrapper, selector: string, value: string) => {
  await wrapper.getComponent<typeof AkDatePicker>(selector).setValue(value)
}

const fillRequired = async (wrapper: Wrapper) => {
  await setDate(wrapper, '.field-data_descoberta', '2026-11-10')
}

const sendButton = (wrapper: Wrapper) => wrapper.get('button[type="submit"]')

describe('admin breach notices page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchBreachNoticeTemplate).mockResolvedValue(template)
    vi.mocked(fetchBreachNotices).mockResolvedValue({
      content: [],
      page: 0,
      size: 10,
      totalElements: 0,
      totalPages: 0,
    })
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
    expect(wrapper.text()).toContain('Data da descoberta *')
    expect(wrapper.text()).not.toContain('Encarregado *')
  })

  it('asks each field the way its type says: date, period, lines or text', async () => {
    const wrapper = await mountPage()

    expect(wrapper.find('.field-data_descoberta .ak-date-trigger').exists()).toBe(true)
    expect(wrapper.find('.field-data_descoberta input').exists()).toBe(false)
    expect(wrapper.find('.field-data_incidente .range-start').exists()).toBe(true)
    expect(wrapper.find('.field-data_incidente .range-end').exists()).toBe(true)
    expect(wrapper.find('.field-dados_afetados textarea').exists()).toBe(true)
    expect(wrapper.get('.field-nome_encarregado input').attributes('placeholder')).toBe('Maria')
  })

  it('takes no date after today', async () => {
    const wrapper = await mountPage()
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

    const discovery = wrapper.getComponent<typeof AkDatePicker>('.field-data_descoberta')
    expect(discovery.props('max')).toBe(today)
    expect(wrapper.getComponent<typeof AkDatePicker>('.range-end').props('max')).toBe(today)
  })

  it('sends a period as start/end, and a lone start as a single date', async () => {
    vi.mocked(previewBreachNotice).mockResolvedValue({ subject: 's', body: 'b' })
    const wrapper = await mountPage()
    await fillRequired(wrapper)
    await setDate(wrapper, '.range-start', '2026-11-08')
    const previewButton = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Pré-visualizar'))!

    await previewButton.trigger('click')
    await flushPromises()
    expect(previewBreachNotice).toHaveBeenLastCalledWith(
      expect.objectContaining({
        fields: expect.objectContaining({ data_incidente: '2026-11-08' }),
      }),
    )

    await setDate(wrapper, '.range-end', '2026-11-09')
    await previewButton.trigger('click')
    await flushPromises()
    expect(previewBreachNotice).toHaveBeenLastCalledWith(
      expect.objectContaining({
        fields: expect.objectContaining({ data_incidente: '2026-11-08/2026-11-09' }),
      }),
    )
  })

  it('keeps sending disabled while the dates are out of order', async () => {
    const wrapper = await mountPage()
    await fillRequired(wrapper)
    await wrapper.get('input.anpd').setValue(true)

    await setDate(wrapper, '.range-start', '2026-11-12')
    expect(wrapper.get('.date-errors').text()).toContain('depois da data em que foi descoberto')
    expect(sendButton(wrapper).attributes('disabled')).toBeDefined()

    await setDate(wrapper, '.range-start', '2026-11-08')
    await setDate(wrapper, '.range-end', '2026-11-07')
    expect(wrapper.get('.date-errors').text()).toContain('o fim não pode ser antes do início')
    expect(sendButton(wrapper).attributes('disabled')).toBeDefined()

    await setDate(wrapper, '.range-end', '2026-11-09')
    expect(wrapper.find('.date-errors').exists()).toBe(false)
    expect(sendButton(wrapper).attributes('disabled')).toBeUndefined()
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
      expect.objectContaining({ fields: { data_descoberta: '2026-11-10', ...EMPTY_FIELDS } }),
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

  it('shows a notice just sent at the top of the history, without a reload', async () => {
    vi.mocked(sendBreachNotice).mockResolvedValue({
      id: 7,
      total: 1,
      sent: 1,
      failed: 0,
      failures: [],
    })
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('Nenhum aviso foi enviado ainda.')
    vi.mocked(fetchBreachNotices).mockResolvedValue({
      content: [
        {
          id: 7,
          subject: 'Aviso recém-enviado',
          sentByName: 'Admin',
          sentAt: new Date('2026-11-15T12:00:00Z'),
          total: 1,
          sent: 1,
          failed: 0,
          pending: 0,
        },
      ],
      page: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
    })
    await fillRequired(wrapper)
    await wrapper.get('input.anpd').setValue(true)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('.history-list .history-item').text()).toContain('Aviso recém-enviado')
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
    expect(
      wrapper.getComponent<typeof AkDatePicker>('.field-data_descoberta').props('modelValue'),
    ).toBe('2026-11-10')
  })

  it('shows the error when the template cannot be loaded', async () => {
    vi.mocked(fetchBreachNoticeTemplate).mockRejectedValue(new Error('Falhou'))

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Falhou')
    expect(wrapper.find('form').exists()).toBe(false)
  })
})
