import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import AkBreachNoticeHistory from '../AkBreachNoticeHistory.vue'
import { fetchBreachNotice, fetchBreachNotices } from '@/services/breach-notices'
import AkStatusChip from '../design-system/AkStatusChip.vue'
import AkPaginator from '../design-system/AkPaginator.vue'

vi.mock('@/services/breach-notices', () => ({
  fetchBreachNotices: vi.fn(),
  fetchBreachNotice: vi.fn(),
}))

const summary = (id: number, subject: string) => ({
  id,
  subject,
  sentByName: 'Admin',
  sentAt: new Date('2026-11-12T10:30:00Z'),
  total: 120,
  sent: 119,
  failed: 1,
  pending: 0,
})

const pageOf = (content: ReturnType<typeof summary>[], page = 0, totalPages = 1) => ({
  content,
  page,
  size: 10,
  totalElements: content.length,
  totalPages,
})

const mountHistory = async () => {
  const wrapper = mount(AkBreachNoticeHistory, {
    global: { components: { AkStatusChip, AkPaginator } },
  })
  await flushPromises()
  return wrapper
}

describe('AkBreachNoticeHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchBreachNotices).mockResolvedValue(
      pageOf([summary(5, 'Aviso B'), summary(4, 'Aviso A')]),
    )
  })

  it('lists date, sender, recipients, sent and failed', async () => {
    const wrapper = await mountHistory()

    const rows = wrapper.findAll('.history-item')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Aviso B')
    expect(rows[0].text()).toContain('Admin')
    expect(rows[0].text()).toContain('120 destinatários')
    expect(rows[0].text()).toContain('119 enviados')
    expect(rows[0].text()).toContain('1 falharam')
  })

  it('says when no notice was sent', async () => {
    vi.mocked(fetchBreachNotices).mockResolvedValue(pageOf([]))

    const wrapper = await mountHistory()

    expect(wrapper.text()).toContain('Nenhum aviso foi enviado ainda.')
  })

  it('opens a notice with its text and each recipient, and the error of a failed one', async () => {
    vi.mocked(fetchBreachNotice).mockResolvedValue({
      ...summary(5, 'Aviso B'),
      body: 'Texto como enviado',
      recipients: [
        { name: 'Ana', email: 'ana@akaer.com.br', status: 'SENT', error: null },
        { name: 'Bruno', email: 'bruno@akaer.com.br', status: 'FAILED', error: 'REJECTED: 550' },
        { name: 'Caio', email: 'caio@akaer.com.br', status: 'PENDING', error: null },
      ],
    })
    const wrapper = await mountHistory()

    await wrapper.get('.history-row').trigger('click')
    await flushPromises()

    expect(fetchBreachNotice).toHaveBeenCalledWith(5)
    const detail = wrapper.get('.history-detail')
    expect(detail.text()).toContain('Texto como enviado')
    const recipients = detail.findAll('.recipient')
    expect(recipients.map((r) => r.findComponent(AkStatusChip).props('status'))).toEqual([
      'SENT',
      'FAILED',
      'PENDING',
    ])
    expect(recipients[1].text()).toContain('bruno@akaer.com.br')
    expect(recipients[1].text()).toContain('REJECTED: 550')
  })

  it('closes an open notice when clicked again', async () => {
    vi.mocked(fetchBreachNotice).mockResolvedValue({
      ...summary(5, 'Aviso B'),
      body: 'Texto',
      recipients: [],
    })
    const wrapper = await mountHistory()

    await wrapper.get('.history-row').trigger('click')
    await flushPromises()
    await wrapper.get('.history-row').trigger('click')

    expect(wrapper.find('.history-detail').exists()).toBe(false)
  })

  it('shows why a notice could not be opened', async () => {
    vi.mocked(fetchBreachNotice).mockRejectedValue(new Error('Aviso não encontrado.'))
    const wrapper = await mountHistory()

    await wrapper.get('.history-row').trigger('click')
    await flushPromises()

    expect(wrapper.get('.history-detail').text()).toContain('Aviso não encontrado.')
  })

  it('goes to another page of notices', async () => {
    vi.mocked(fetchBreachNotices).mockResolvedValue(pageOf([summary(5, 'Aviso B')], 0, 2))
    const wrapper = await mountHistory()

    wrapper.getComponent(AkPaginator).vm.$emit('change', 1)
    await flushPromises()

    expect(fetchBreachNotices).toHaveBeenLastCalledWith(1)
  })

  it('shows the error when the list cannot be loaded', async () => {
    vi.mocked(fetchBreachNotices).mockRejectedValue(new Error('Falhou (HTTP 500).'))

    const wrapper = await mountHistory()

    expect(wrapper.text()).toContain('Falhou (HTTP 500).')
  })
})
