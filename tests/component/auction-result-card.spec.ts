import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AuctionResultCard from '@/components/game/AuctionResultCard.vue'
import { createDeck } from '@/domain/deck'
import { startGame } from '@/domain/game-engine'
import type { AuctionResult } from '@/domain/model'

describe('AuctionResultCard', () => {
  it('pins the latest result with its round, artworks, amount, and joint-auction payouts', () => {
    const game = startGame({ aiCount: 2, seed: 'auction-result-card' })
    const cards = createDeck()
      .filter((card) => card.artistId === 'yellow')
      .slice(0, 2)
    const result: AuctionResult = {
      id: 99,
      kind: 'auction',
      round: 2,
      auctionType: 'open',
      cards,
      winnerId: 'ai-1',
      amount: 24,
      cardCount: 2,
      payouts: [
        { playerId: 'human', role: 'primary', amount: 12 },
        { playerId: 'ai-2', role: 'secondary', amount: 12 },
      ],
    }

    const wrapper = mount(AuctionResultCard, { props: { game, result } })
    const text = wrapper.text()

    expect(text).toContain('R2 · HAMMER DOWN')
    expect(text).toContain('最新成交')
    expect(text).toContain('聯合拍賣 · 公開競價')
    expect(text).toContain('AI 畫商 1 得標')
    expect(text).toContain('$24k')
    expect(wrapper.findAll('.auction-result-card__artwork')).toHaveLength(2)
    expect(text).toContain('主要拍賣官 · 你的藝廊')
    expect(text).toContain('次要拍賣官 · AI 畫商 2')
    expect(text).toContain('獲得 +$12k')
  })

  it('clearly separates the winner payment, auctioneer payout, and bank payment', () => {
    const game = startGame({ aiCount: 2, seed: 'auction-result-bank' })
    const result: AuctionResult = {
      id: 100,
      winnerId: 'human',
      amount: 11,
      cardCount: 2,
      payouts: [{ playerId: 'ai-1', role: 'primary', amount: 6 }],
      bankPayment: 5,
    }

    const text = mount(AuctionResultCard, { props: { game, result } }).text()

    expect(text).toContain('你的藝廊支付成交價 $11k')
    expect(text).toContain('主要拍賣官 · AI 畫商 1獲得 +$6k')
    expect(text).toContain('支付銀行$5k')
  })

  it('shows a free unmatched Double result and offers a mobile ledger toggle', async () => {
    const game = startGame({ aiCount: 2, seed: 'auction-result-free' })
    const card = createDeck().find((candidate) => candidate.auctionType === 'double')
    if (!card) throw new Error('expected a Double card')
    const result: AuctionResult = {
      id: 101,
      kind: 'unmatched-double',
      round: 3,
      auctionType: 'double',
      cards: [card],
      winnerId: 'human',
      amount: 0,
      cardCount: 1,
      payouts: [],
    }

    const wrapper = mount(AuctionResultCard, { props: { game, result } })
    const toggle = wrapper.get('.auction-result-card__toggle')

    expect(wrapper.text()).toContain('R3 · HAMMER DOWN')
    expect(wrapper.text()).toContain('你的藝廊 免費獲得')
    expect(wrapper.text()).toContain('聯合拍賣無人補牌')
    expect(toggle.attributes('aria-expanded')).toBe('false')

    await toggle.trigger('click')

    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.classes()).toContain('auction-result-card--expanded')
  })
})
