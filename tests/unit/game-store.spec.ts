import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createDeck } from '@/domain/deck'
import { playCard, startGame } from '@/domain/game-engine'
import { useGameStore } from '@/stores/game.store'

describe('game store auction result', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    vi.useFakeTimers()
  })

  afterEach(() => vi.useRealTimers())

  it('keeps the latest auction result visible until another result replaces it', async () => {
    const store = useGameStore()
    const game = startGame({ aiCount: 2, seed: 'persistent-auction-result' })
    const sealedCard = createDeck().find((card) => card.auctionType === 'sealed')
    if (!sealedCard) throw new Error('sealed card not found')

    game.auctioneerIndex = 2
    game.players[2]!.hand = [sealedCard]
    store.game = playCard(game, 'ai-2', sealedCard.id)
    store.humanSealedBid(10)

    await vi.advanceTimersByTimeAsync(1000)
    const resultId = store.auctionResultNotice?.id
    expect(resultId).toBeTypeOf('number')

    await vi.advanceTimersByTimeAsync(10_000)
    expect(store.auctionResultNotice?.id).toBe(resultId)
  })
})
