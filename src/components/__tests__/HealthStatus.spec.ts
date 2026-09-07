import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import HealthStatus from '../HealthStatus.vue'

describe('HealthStatus', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('inicia no estado "idle"', () => {
    const wrapper = mount(HealthStatus)
    expect(wrapper.text()).toContain('Ainda não verificado.')
  })

  it('marca o servidor como UP quando /health responde UP', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'UP' }),
      }),
    )

    const wrapper = mount(HealthStatus)
    await wrapper.get('button').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Servidor disponível (UP).')
    })
  })

  it('marca o servidor como indisponível quando o fetch falha', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))

    const wrapper = mount(HealthStatus)
    await wrapper.get('button').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Servidor indisponível.')
    })
  })
})
