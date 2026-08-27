import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import RoundResultModal from '@/components/game/RoundResultModal.vue'
import { createDeck } from '@/domain/deck'
import { playCard, startGame } from '@/domain/game-engine'
import {
  restoreDefaultDeveloperSettings,
  saveDeveloperSettings,
} from '@/services/developer-settings.service'

describe('RoundResultModal', () => {
  afterEach(() => restoreDefaultDeveloperSettings())

  it('shows all artworks and can hide purchase costs in developer mode', async () => {
    const game = startGame({ aiCount: 2, seed: 'round-result-modal' })
    game.auctioneerIndex = 0
    const soldCard = createDeck().find(
      (card) => card.artistId === 'yellow' && card.auctionType === 'sealed',
    )
    const unsoldCard = createDeck().find(
      (card) => card.artistId === 'green' && card.auctionType === 'fixed-price',
    )
    const finishingCard = createDeck().find(
      (card) => card.artistId === 'yellow' && card.auctionType === 'open',
    )
    if (!soldCard || !unsoldCard || !finishingCard) throw new Error('fixture cards not found')

    game.players[0]!.gallery = [
      { card: soldCard, acquisition: 'auction', sellableThisRound: true, purchasePrice: 14 },
      { card: unsoldCard, acquisition: 'auction', sellableThisRound: true, purchasePrice: 9 },
    ]
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
    expect(wrapper.text()).toContain('密封出價 · 買進 $14k · 賣給銀行 $60k')
    expect(wrapper.text()).toContain('定價拍賣 · 買進 $9k · 未進前三名，本輪未售')
    expect(wrapper.findAll('.round-sale-card')).toHaveLength(2)
    expect(wrapper.findAll('.round-sale-card--unsold')).toHaveLength(1)
    expect(wrapper.text()).toContain('本輪收入 +$60k')
    expect(wrapper.text()).toContain('第 3 輪首位拍賣官')
    expect(wrapper.get('.next-round-auctioneer strong').text()).toBe('AI 畫商 1')
    expect(wrapper.findAll('.result-podium li')[0]?.classes()).toContain('result-podium__rank--1')
    expect(wrapper.findAll('.result-podium li')[1]?.classes()).toContain('result-podium__rank--2')
    expect(wrapper.findAll('.result-podium li')[2]?.classes()).toContain('result-podium__rank--3')
    expect(wrapper.findAll('.round-sales__empty')).toHaveLength(2)

    saveDeveloperSettings({ showAICash: true, showPurchaseCosts: false })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('買進 $14k')
    expect(wrapper.text()).not.toContain('買進 $9k')
    expect(wrapper.text()).toContain('密封出價 · 賣給銀行 $60k')
    expect(wrapper.text()).toContain('定價拍賣 · 未進前三名，本輪未售')
  })
})
