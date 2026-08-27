import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AuctionLog from '@/components/game/AuctionLog.vue'
import { startGame } from '@/domain/game-engine'

describe('AuctionLog', () => {
  it('shows the complete game history with the latest entry first', () => {
    const game = startGame({ aiCount: 2, seed: 'auction-log' })
    game.log = Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      message: `遊戲動態 ${index + 1}`,
      tone: 'neutral' as const,
    }))

    const wrapper = mount(AuctionLog, { props: { game } })
    const entries = wrapper.findAll('.auction-log__list li')

    expect(entries).toHaveLength(12)
    expect(entries[0]?.text()).toContain('遊戲動態 12')
    expect(entries.at(-1)?.text()).toContain('遊戲動態 1')
    expect(wrapper.get('.auction-log__live').text()).toContain('全場 12 筆')
  })
})
