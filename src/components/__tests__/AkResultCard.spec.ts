import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AkResultCard from '../AkResultCard.vue'
import { useResultStore } from '@/stores/result-store'
import type { ResultPayload } from '@/types/DocData'

const push = vi.fn()

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRouter: () => ({ push }),
}))

const payload: ResultPayload = {
  documentData: {
    id: 7,
    title: 'Manual de Integração',
    category: 'Tecnico',
    shortDescription: 'Procedimentos para integração…',
    responsableName: 'ana',
    lastUpdate: new Date('2026-09-26T01:27:40Z'),
  },
}

describe('AkResultCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    push.mockClear()
  })

  it('abre o documento ao clicar em qualquer parte do card', async () => {
    useResultStore().query = 'integração'
    const wrapper = mount(AkResultCard, { props: { payload } })

    await wrapper.get('.text-title-small').trigger('click')

    expect(push).toHaveBeenCalledOnce()
    expect(push).toHaveBeenCalledWith({ path: '/docs/7', query: { q: 'integração' } })
    expect(useResultStore().result).toEqual(payload)
  })

  it('abre o documento uma vez só pelo botão de seta', async () => {
    const wrapper = mount(AkResultCard, { props: { payload } })

    await wrapper.get('button').trigger('click')

    expect(push).toHaveBeenCalledOnce()
    expect(push).toHaveBeenCalledWith({ path: '/docs/7', query: {} })
  })
})
