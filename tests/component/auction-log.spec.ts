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

  it('labels entries by round and emphasizes artwork wins', () => {
    const game = startGame({ aiCount: 2, seed: 'auction-log-win' })
    game.log = [
      { id: 1, message: '第 1 輪開始。', round: 1, tone: 'round' },
      { id: 2, message: 'AI 畫商 1 以 $20k 得標 1 張作品。', round: 2, tone: 'win' },
    ]

    const wrapper = mount(AuctionLog, { props: { game } })
    const winEntry = wrapper.get('.auction-log__entry--win')

    expect(winEntry.get('.auction-log__round').text()).toBe('R2')
    expect(winEntry.text()).toContain('AI 畫商 1 以 $20k 得標 1 張作品。')
    expect(wrapper.findAll('.auction-log__round').map((entry) => entry.text())).toEqual([
      'R2',
      'R1',
    ])
  })

  it('infers round labels for logs loaded from older saves', () => {
    const game = startGame({ aiCount: 2, seed: 'auction-log-legacy' })
    game.log = [
      { id: 1, message: '第 1 輪開始。', tone: 'round' },
      { id: 2, message: '第 2 輪開始。', tone: 'round' },
      { id: 3, message: '玩家推出作品。', tone: 'neutral' },
    ]

    const wrapper = mount(AuctionLog, { props: { game } })

    expect(wrapper.findAll('.auction-log__round').map((entry) => entry.text())).toEqual([
      'R2',
      'R2',
      'R1',
    ])
  })
})
