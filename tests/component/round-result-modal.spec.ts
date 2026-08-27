import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RoundResultModal from '@/components/game/RoundResultModal.vue'
import { createDeck } from '@/domain/deck'
import { playCard, startGame } from '@/domain/game-engine'

describe('RoundResultModal', () => {
  it('shows the artworks each player sold to the bank', () => {
    const game = startGame({ aiCount: 2, seed: 'round-result-modal' })
    game.auctioneerIndex = 0
    const soldCard = createDeck().find(
      (card) => card.artistId === 'yellow' && card.auctionType === 'sealed',
    )
    const finishingCard = createDeck().find(
      (card) => card.artistId === 'yellow' && card.auctionType === 'open',
    )
    if (!soldCard || !finishingCard) throw new Error('fixture cards not found')

    game.players[0]!.gallery = [{ card: soldCard, acquisition: 'auction', sellableThisRound: true }]
    game.players[0]!.hand = [finishingCard]
    game.round = 2
    game.marketHistory = [
      {
        round: 1,
        values: { yellow: 30, blue: 20, red: 10, green: 0, brown: 0 },
        counts: { yellow: 5, blue: 4, red: 3, green: 2, brown: 1 },
      },
    ]
    game.roundCounts.yellow = 4

    const wrapper = mount(RoundResultModal, {
      props: { game: playCard(game, 'human', finishingCard.id) },
    })

    expect(wrapper.text()).toContain('你的藝廊')
    expect(wrapper.text()).toContain('卡瓦略')
    expect(wrapper.text()).toContain('R1 $30k')
    expect(wrapper.text()).toContain('R2 $30k')
    expect(wrapper.text()).toContain('單張累計 $60k')
    expect(wrapper.text()).toContain('密封出價 · 賣給銀行 $60k')
    expect(wrapper.text()).toContain('本輪收入 +$60k')
    expect(wrapper.text()).toContain('第 3 輪首位拍賣官')
    expect(wrapper.get('.next-round-auctioneer strong').text()).toBe('AI 畫商 1')
    expect(wrapper.findAll('.round-sales__empty')).toHaveLength(2)
  })
})
