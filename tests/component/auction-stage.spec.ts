import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import AuctionStage from '@/components/game/AuctionStage.vue'
import { createDeck } from '@/domain/deck'
import { playCard, startGame } from '@/domain/game-engine'
import { useGameStore } from '@/stores/game.store'

describe('AuctionStage', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('offers quick bid buttons and blocks an amount above the player cash', async () => {
    const store = useGameStore()
    const game = startGame({ aiCount: 2, seed: 'auction-input' })
    const auctionCard = createDeck().find((card) => card.auctionType === 'once-around')
    if (!auctionCard) throw new Error('expected a once-around card')

    game.auctioneerIndex = 2
    game.players[2]!.hand = [auctionCard]
    store.game = playCard(game, 'ai-2', auctionCard.id)

    const wrapper = mount(AuctionStage)
    const amountInput = wrapper.get('input[aria-label="輸入出價金額"]')
    const quickAddTen = wrapper.findAll('button').find((button) => button.text().trim() === '+10k')

    expect(amountInput.element).toHaveProperty('value', '1')
    expect(wrapper.text()).toContain('本次拍賣官AI 畫商 2')
    expect(quickAddTen).toBeDefined()
    await quickAddTen!.trigger('click')
    expect(amountInput.element).toHaveProperty('value', '11')

    await amountInput.setValue('101')
    expect(wrapper.text()).toContain('超過可用現金 $100k')
    expect(wrapper.get('button.button--primary').attributes('disabled')).toBeDefined()
  })

  it('shows the winner and purchase amount after an auction settles', () => {
    const store = useGameStore()
    store.game = startGame({ aiCount: 2, seed: 'auction-result-notice' })
    store.auctionResultNotice = {
      id: 99,
      winnerId: 'ai-1',
      amount: 24,
      cardCount: 2,
      payouts: [
        { playerId: 'human', role: 'primary', amount: 12 },
        { playerId: 'ai-2', role: 'secondary', amount: 12 },
      ],
    }

    const wrapper = mount(AuctionStage)

    expect(wrapper.get('.auction-result-notice').text()).toContain('AI 畫商 1 得標')
    expect(wrapper.get('.auction-result-notice').text()).toContain('$24k · 2 張作品')
    expect(wrapper.get('.auction-result-notice').text()).toContain('主要拍賣官 · 你的藝廊')
    expect(wrapper.get('.auction-result-notice').text()).toContain('獲得 $12k')
    expect(wrapper.get('.auction-result-notice').text()).toContain('次要出牌玩家 · AI 畫商 2')
    expect(wrapper.get('.auction-result-notice').classes()).toContain('auction-result-notice')
  })

  it('shows a bank payment when the auctioneer buys their own artwork', () => {
    const store = useGameStore()
    store.game = startGame({ aiCount: 2, seed: 'auctioneer-bank-payment' })
    store.auctionResultNotice = {
      id: 100,
      winnerId: 'human',
      amount: 18,
      cardCount: 1,
      payouts: [],
      bankPayment: 18,
    }

    const wrapper = mount(AuctionStage)

    expect(wrapper.get('.auction-result-notice').text()).toContain('得標拍賣官 · 你的藝廊')
    expect(wrapper.get('.auction-result-notice').text()).toContain('支付銀行 $18k')
  })

  it('shows both the other auctioneer payout and the winner bank payment', () => {
    const store = useGameStore()
    store.game = startGame({ aiCount: 2, seed: 'joint-auctioneer-self-buy' })
    store.auctionResultNotice = {
      id: 101,
      winnerId: 'human',
      amount: 11,
      cardCount: 2,
      payouts: [{ playerId: 'ai-1', role: 'primary', amount: 6 }],
      bankPayment: 5,
    }

    const wrapper = mount(AuctionStage)
    const notice = wrapper.get('.auction-result-notice').text()

    expect(notice).toContain('主要拍賣官 · AI 畫商 1')
    expect(notice).toContain('獲得 $6k')
    expect(notice).toContain('得標拍賣官 · 你的藝廊')
    expect(notice).toContain('支付銀行 $5k')
  })

  it('shows a free acquisition when nobody supplements a Double card', () => {
    const store = useGameStore()
    store.game = startGame({ aiCount: 2, seed: 'unmatched-double-notice' })
    store.auctionResultNotice = {
      id: 102,
      kind: 'unmatched-double',
      winnerId: 'human',
      amount: 0,
      cardCount: 1,
      payouts: [],
    }

    const notice = mount(AuctionStage).get('.auction-result-notice').text()

    expect(notice).toContain('HAMMER DOWN')
    expect(notice).toContain('你的藝廊 免費獲得')
    expect(notice).toContain('未配對聯合拍賣 · 1 張作品')
    expect(notice).toContain('聯合拍賣無人補牌')
    expect(notice).toContain('支付 $0k')
  })
})
