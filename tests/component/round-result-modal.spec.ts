import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RoundResultModal from '@/components/game/RoundResultModal.vue'
import { createDeck } from '@/domain/deck'
import { playCard, startGame } from '@/domain/game-engine'

describe('RoundResultModal', () => {
  it('shows the artworks each player sold to the bank', () => {
    const game = startGame({ aiCount: 2, seed: 'round-result-modal' })
    const soldCard = createDeck().find(
      (card) => card.artistId === 'yellow' && card.auctionType === 'sealed',
    )
    const finishingCard = createDeck().find(
      (card) => card.artistId === 'yellow' && card.auctionType === 'open',
    )
    if (!soldCard || !finishingCard) throw new Error('fixture cards not found')

    game.players[0]!.gallery = [{ card: soldCard, acquisition: 'auction', sellableThisRound: true }]
    game.players[0]!.hand = [finishingCard]
    game.roundCounts.yellow = 4

    const wrapper = mount(RoundResultModal, {
      props: { game: playCard(game, 'human', finishingCard.id) },
    })

    expect(wrapper.text()).toContain('你的藝廊')
    expect(wrapper.text()).toContain('卡瓦略')
    expect(wrapper.text()).toContain('密封出價 · 賣給銀行 $30k')
    expect(wrapper.text()).toContain('本輪收入 +$30k')
    expect(wrapper.findAll('.round-sales__empty')).toHaveLength(2)
  })
})
