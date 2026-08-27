import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import { createDeck } from '@/domain/deck'
import {
  continueAfterRound,
  currentActorId,
  passBid,
  placeBid,
  playCard,
  respondToDouble,
  respondToFixedPrice,
  setFixedPrice,
  skipEmptyAuctioneer,
  startGame,
  submitSealedBid,
} from '@/domain/game-engine'
import type { GameState, PlayerId } from '@/domain/model'
import { decideAI, type AIDecision } from '@/ai/ai-controller'

function card(artist: 'yellow' | 'blue' | 'red' | 'green' | 'brown', type: string) {
  const found = createDeck().find((item) => item.artistId === artist && item.auctionType === type)
  if (!found) throw new Error('fixture card not found')
  return found
}

function executeDecision(state: GameState, playerId: PlayerId, decision: AIDecision): GameState {
  state.rngState = decision.rngState
  switch (decision.type) {
    case 'play-card':
      return playCard(state, playerId, decision.cardId)
    case 'skip-empty':
      return skipEmptyAuctioneer(state, playerId)
    case 'double':
      return respondToDouble(state, playerId, decision.cardId)
    case 'bid':
      return placeBid(state, playerId, decision.amount)
    case 'pass':
      return passBid(state, playerId)
    case 'sealed':
      return submitSealedBid(state, playerId, decision.amount)
    case 'set-price':
      return setFixedPrice(state, playerId, decision.amount)
    case 'fixed-response':
      return respondToFixedPrice(state, playerId, decision.accept)
  }
}

describe('game engine', () => {
  it('accepts Vue reactive state when a player takes an action', () => {
    const game = reactive(startGame({ aiCount: 2, seed: 'vue-reactive-state' }))
    game.auctioneerIndex = 0
    const selectedCard = game.players[0]?.hand[0]
    if (!selectedCard) throw new Error('expected a card in the human hand')

    const result = playCard(game, 'human', selectedCard.id)

    expect(result.roundCounts[selectedCard.artistId]).toBe(1)
    expect(result.players[0]?.hand.some((card) => card.id === selectedCard.id)).toBe(false)
  })

  it.each([
    [2, 10],
    [3, 9],
    [4, 8],
  ] as const)('deals the correct hand for %i AI players', (aiCount, expectedHand) => {
    const game = startGame({ aiCount, seed: `deal-${aiCount}` })
    expect(game.players).toHaveLength(aiCount + 1)
    expect(game.players.every((player) => player.hand.length === expectedHand)).toBe(true)
    expect(game.players.every((player) => player.cash === 100)).toBe(true)
  })

  it('uses configured gallery and AI dealer identities', () => {
    const game = startGame({
      aiCount: 2,
      seed: 'configured-player-identities',
      humanName: '橘子藝廊',
      aiPlayers: [
        { name: '穩健畫商', personality: 'conservative' },
        { name: '市場獵手', personality: 'aggressive' },
      ],
    })

    expect(game.players[0]?.name).toBe('橘子藝廊')
    expect(game.players[1]).toMatchObject({ name: '穩健畫商', personality: 'conservative' })
    expect(game.players[2]).toMatchObject({ name: '市場獵手', personality: 'aggressive' })
  })

  it.each(['conservative', 'balanced', 'aggressive', 'chaotic'] as const)(
    'caps %s AI bids at the maximum possible market resale value',
    (personality) => {
      const game = startGame({ aiCount: 2, seed: `market-cap-${personality}` })
      game.round = 3
      game.marketHistory = [
        {
          round: 1,
          values: { yellow: 10, blue: 0, red: 0, green: 0, brown: 0 },
          counts: { yellow: 3, blue: 2, red: 1, green: 0, brown: 0 },
        },
        {
          round: 2,
          values: { yellow: 10, blue: 0, red: 0, green: 0, brown: 0 },
          counts: { yellow: 3, blue: 2, red: 1, green: 0, brown: 0 },
        },
      ]
      game.auctioneerIndex = 0
      game.players[1]!.personality = personality
      const auctionCard = card('yellow', 'sealed')
      game.players[0]!.hand = [auctionCard]
      const auctionState = playCard(game, 'human', auctionCard.id)

      const decision = decideAI(auctionState, 'ai-1')

      expect(decision.type).toBe('sealed')
      if (decision.type !== 'sealed') throw new Error('expected a sealed bid')
      expect(decision.amount).toBeLessThanOrEqual(50)
    },
  )

  it('rejects a fixed price above the maximum possible market resale value', () => {
    const game = startGame({ aiCount: 2, seed: 'fixed-price-market-cap' })
    game.round = 3
    game.marketHistory = [
      {
        round: 1,
        values: { yellow: 10, blue: 0, red: 0, green: 0, brown: 0 },
        counts: { yellow: 3, blue: 2, red: 1, green: 0, brown: 0 },
      },
      {
        round: 2,
        values: { yellow: 10, blue: 0, red: 0, green: 0, brown: 0 },
        counts: { yellow: 3, blue: 2, red: 1, green: 0, brown: 0 },
      },
    ]
    game.auctioneerIndex = 0
    game.players[1]!.personality = 'aggressive'
    const auctionCard = card('yellow', 'fixed-price')
    game.players[0]!.hand = [auctionCard]
    let auctionState = playCard(game, 'human', auctionCard.id)
    auctionState = setFixedPrice(auctionState, 'human', 51)

    const decision = decideAI(auctionState, 'ai-1')

    expect(decision).toMatchObject({ type: 'fixed-response', accept: false })
  })

  it('selects the first auctioneer randomly and reproducibly from all players', () => {
    const first = startGame({ aiCount: 4, seed: 'random-auctioneer' })
    const repeated = startGame({ aiCount: 4, seed: 'random-auctioneer' })
    const selectedIndexes = new Set(
      Array.from(
        { length: 30 },
        (_, index) => startGame({ aiCount: 4, seed: `auctioneer-${index}` }).auctioneerIndex,
      ),
    )

    expect(first.auctioneerIndex).toBe(repeated.auctioneerIndex)
    expect(first.auctioneerIndex).toBeGreaterThanOrEqual(0)
    expect(first.auctioneerIndex).toBeLessThan(first.players.length)
    expect(selectedIndexes).toEqual(new Set([0, 1, 2, 3, 4]))
  })

  it('ends the round immediately on the fifth card without auctioning it', () => {
    const game = startGame({ aiCount: 2, seed: 'fifth-card' })
    game.auctioneerIndex = 0
    const finishingCard = card('yellow', 'open')
    game.players[0]!.hand = [finishingCard]
    game.roundCounts.yellow = 4

    const result = playCard(game, 'human', finishingCard.id)

    expect(result.phase).toBe('round-result')
    expect(result.roundCounts.yellow).toBe(5)
    expect(result.auction).toBeNull()
    expect(result.players.every((player) => player.gallery.length === 0)).toBe(true)
    expect(result.roundResult?.values.yellow).toBe(30)
    expect(result.roundResult?.nextAuctioneerId).toBe('ai-1')
    expect(result.log.at(-1)?.message).toBe(
      '第 1 輪落幕，你的藝廊 推出本輪最後一張畫作，市場完成結算。',
    )

    const nextRound = continueAfterRound(result)
    expect(nextRound.players[nextRound.auctioneerIndex]?.id).toBe(
      result.roundResult?.nextAuctioneerId,
    )
  })

  it('keeps the complete game log after it exceeds 80 entries', () => {
    const game = startGame({ aiCount: 2, seed: 'complete-game-log' })
    game.auctioneerIndex = 0
    game.log = Array.from({ length: 80 }, (_, index) => ({
      id: index + 1,
      message: `歷史紀錄 ${index + 1}`,
      tone: 'neutral' as const,
    }))
    game.nextLogId = 81
    const selectedCard = game.players[0]?.hand.find(
      (candidate) => candidate.auctionType !== 'double',
    )
    if (!selectedCard) throw new Error('expected a non-double card')

    const result = playCard(game, 'human', selectedCard.id)

    expect(result.log).toHaveLength(82)
    expect(result.log[0]?.message).toBe('歷史紀錄 1')
    expect(result.log.at(-1)?.message).toContain('拍賣開始')
  })

  it('uses clockwise priority to break sealed bid ties', () => {
    const game = startGame({ aiCount: 2, seed: 'sealed-tie' })
    game.auctioneerIndex = 0
    const auctionCard = card('blue', 'sealed')
    game.players[0]!.hand = [auctionCard]
    let state = playCard(game, 'human', auctionCard.id)
    expect(state.auction?.turnOrder).toEqual(['ai-1', 'ai-2', 'human'])

    state = submitSealedBid(state, 'ai-1', 10)
    state = submitSealedBid(state, 'ai-2', 10)
    state = submitSealedBid(state, 'human', 10)

    expect(state.players.find((player) => player.id === 'ai-1')?.gallery).toHaveLength(1)
    expect(state.players.find((player) => player.id === 'ai-1')?.cash).toBe(90)
    expect(state.players.find((player) => player.id === 'human')?.cash).toBe(110)
    expect(state.log.some((entry) => entry.message === 'AI 畫商 1 密封出價 $10k。')).toBe(true)
    expect(state.log.some((entry) => entry.message === 'AI 畫商 2 密封出價 $10k。')).toBe(true)
    expect(state.lastAuctionResult?.payouts).toEqual([
      { playerId: 'human', role: 'primary', amount: 10 },
    ])
  })

  it('tracks public bids and pass states while rejecting bids above available cash', () => {
    const game = startGame({ aiCount: 2, seed: 'visible-bid-status' })
    game.auctioneerIndex = 0
    const auctionCard = card('brown', 'once-around')
    game.players[0]!.hand = [auctionCard]
    let state = playCard(game, 'human', auctionCard.id)

    expect(() => placeBid(state, 'ai-1', 101)).toThrow('出價必須是高於目前價格且不超過現金的整數。')

    state = placeBid(state, 'ai-1', 7)
    expect(state.auction?.bids['ai-1']).toBe(7)

    state = passBid(state, 'ai-2')
    expect(state.auction?.passedPlayerIds).toContain('ai-2')
  })

  it('makes the auctioneer buy a fixed-price artwork when everyone declines', () => {
    const game = startGame({ aiCount: 2, seed: 'fixed-decline' })
    game.auctioneerIndex = 0
    const auctionCard = card('red', 'fixed-price')
    game.players[0]!.hand = [auctionCard]
    let state = playCard(game, 'human', auctionCard.id)
    state = setFixedPrice(state, 'human', 20)
    state = respondToFixedPrice(state, 'ai-1', false)
    state = respondToFixedPrice(state, 'ai-2', false)

    expect(state.players[0]?.cash).toBe(80)
    expect(state.players[0]?.gallery).toHaveLength(1)
    expect(state.phase).toBe('select-card')
    expect(state.lastAuctionResult).toMatchObject({
      winnerId: 'human',
      amount: 20,
      payouts: [],
      bankPayment: 20,
    })
  })

  it('splits joint auction revenue and gives odd remainder to the second provider', () => {
    const game = startGame({ aiCount: 2, seed: 'joint-split' })
    game.auctioneerIndex = 0
    const jointCard = card('green', 'double')
    const secondCard = card('green', 'open')
    game.players[0]!.hand = [jointCard]
    game.players[1]!.hand = [secondCard]

    let state = playCard(game, 'human', jointCard.id)
    state = respondToDouble(state, 'human')
    state = respondToDouble(state, 'ai-1', secondCard.id)
    expect(state.pendingDouble).toBeNull()
    expect(state.auction?.cards.map((auctionCard) => auctionCard.id)).toEqual([
      jointCard.id,
      secondCard.id,
    ])
    expect(state.auction?.primaryAuctioneerId).toBe('ai-1')
    expect(state.auction?.secondaryAuctioneerId).toBe('human')
    expect(state.auction?.turnOrder).toEqual(['ai-2', 'human', 'ai-1'])
    state = placeBid(state, 'ai-2', 11)
    state = passBid(state, 'human')
    state = passBid(state, 'ai-1')

    expect(state.players.find((player) => player.id === 'human')?.cash).toBe(105)
    expect(state.players.find((player) => player.id === 'ai-1')?.cash).toBe(106)
    expect(state.players.find((player) => player.id === 'ai-2')?.cash).toBe(89)
    expect(state.players.find((player) => player.id === 'ai-2')?.gallery).toHaveLength(2)
    expect(
      state.players
        .find((player) => player.id === 'ai-2')
        ?.gallery.map((entry) => entry.purchasePrice),
    ).toEqual([6, 5])
    expect(state.lastAuctionResult).toMatchObject({
      winnerId: 'ai-2',
      amount: 11,
      cardCount: 2,
      payouts: [
        { playerId: 'ai-1', role: 'primary', amount: 6 },
        { playerId: 'human', role: 'secondary', amount: 5 },
      ],
    })
    expect(state.auctioneerIndex).toBe(2)
    expect(currentActorId(state)).toBe('ai-2')
  })

  it('records a free acquisition result when nobody supplements a Double card', () => {
    const game = startGame({ aiCount: 2, seed: 'unmatched-double-result' })
    game.auctioneerIndex = 0
    const jointCard = card('green', 'double')
    game.players[0]!.hand = [jointCard]

    let state = playCard(game, 'human', jointCard.id)
    state = respondToDouble(state, 'human')
    state = respondToDouble(state, 'ai-1')
    state = respondToDouble(state, 'ai-2')

    expect(state.phase).toBe('select-card')
    expect(state.players[0]?.gallery).toEqual([
      {
        card: jointCard,
        acquisition: 'unmatched-double',
        sellableThisRound: false,
        purchasePrice: 0,
      },
    ])
    expect(state.lastAuctionResult).toEqual({
      id: expect.any(Number),
      kind: 'unmatched-double',
      winnerId: 'human',
      amount: 0,
      cardCount: 1,
      payouts: [],
    })
    expect(state.auctioneerIndex).toBe(1)
  })

  it.each([
    ['ai-1', 'primary'],
    ['human', 'secondary'],
  ] as const)(
    'makes a joint-auction card provider (%s, %s) pay the bank when they win',
    (winnerId) => {
      const game = startGame({ aiCount: 2, seed: `joint-self-buy-${winnerId}` })
      game.auctioneerIndex = 0
      const jointCard = card('green', 'double')
      const secondCard = card('green', 'open')
      game.players[0]!.hand = [jointCard]
      game.players[1]!.hand = [secondCard]

      let state = playCard(game, 'human', jointCard.id)
      state = respondToDouble(state, 'human')
      state = respondToDouble(state, 'ai-1', secondCard.id)
      state = passBid(state, 'ai-2')
      if (winnerId === 'human') {
        state = placeBid(state, 'human', 11)
        state = passBid(state, 'ai-1')
      } else {
        state = passBid(state, 'human')
        state = placeBid(state, 'ai-1', 11)
      }

      expect(state.lastAuctionResult).toMatchObject({
        winnerId,
        amount: 11,
        payouts:
          winnerId === 'ai-1'
            ? [{ playerId: 'human', role: 'secondary', amount: 5 }]
            : [{ playerId: 'ai-1', role: 'primary', amount: 6 }],
        bankPayment: winnerId === 'ai-1' ? 6 : 5,
      })
      expect(state.players.find((player) => player.id === winnerId)?.cash).toBe(89)
      expect(
        state.players.find((player) => player.id === (winnerId === 'human' ? 'ai-1' : 'human')),
      ).toMatchObject({ cash: winnerId === 'human' ? 106 : 105 })
    },
  )

  it('records sold and unsold artworks with their purchase costs before clearing galleries', () => {
    const game = startGame({ aiCount: 2, seed: 'round-sales' })
    game.auctioneerIndex = 0
    const soldCard = card('yellow', 'sealed')
    const unsoldCard = card('green', 'fixed-price')
    const finishingCard = card('yellow', 'open')
    game.players[0]!.gallery = [
      { card: soldCard, acquisition: 'auction', sellableThisRound: true, purchasePrice: 14 },
      { card: unsoldCard, acquisition: 'auction', sellableThisRound: true, purchasePrice: 9 },
    ]
    game.players[0]!.hand = [finishingCard]
    game.roundCounts.yellow = 4

    const result = playCard(game, 'human', finishingCard.id)

    expect(result.roundResult?.sales?.human).toEqual([{ card: soldCard, unitPrice: 30 }])
    expect(result.roundResult?.artworks?.human).toEqual([
      {
        card: soldCard,
        acquisition: 'auction',
        sellableThisRound: true,
        purchasePrice: 14,
        bankSalePrice: 30,
      },
      {
        card: unsoldCard,
        acquisition: 'auction',
        sellableThisRound: true,
        purchasePrice: 9,
        bankSalePrice: undefined,
      },
    ])
    expect(result.roundResult?.earnings.human).toBe(30)
    expect(result.players[0]?.cash).toBe(130)
    expect(result.players[0]?.gallery).toEqual([])
  })

  it('can simulate complete games without deadlocking', () => {
    for (const seed of ['gallery-a', 'gallery-b', 'gallery-c']) {
      let state = startGame({ aiCount: 3, seed })
      let steps = 0
      while (state.phase !== 'game-over' && steps < 6000) {
        if (state.phase === 'round-result') {
          state = continueAfterRound(state)
        } else {
          const actorId = currentActorId(state)
          if (!actorId) throw new Error(`missing actor in ${state.phase}`)
          state = executeDecision(state, actorId, decideAI(state, actorId))
        }
        steps += 1
      }
      expect(state.phase, `${seed} stopped after ${steps} steps`).toBe('game-over')
      expect(state.marketHistory).toHaveLength(4)
      expect(state.players.every((player) => player.cash >= 0)).toBe(true)
    }
  })
})
