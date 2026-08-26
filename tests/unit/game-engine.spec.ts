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

  it('ends the round immediately on the fifth card without auctioning it', () => {
    const game = startGame({ aiCount: 2, seed: 'fifth-card' })
    const finishingCard = card('yellow', 'open')
    game.players[0]!.hand = [finishingCard]
    game.roundCounts.yellow = 4

    const result = playCard(game, 'human', finishingCard.id)

    expect(result.phase).toBe('round-result')
    expect(result.roundCounts.yellow).toBe(5)
    expect(result.auction).toBeNull()
    expect(result.players.every((player) => player.gallery.length === 0)).toBe(true)
    expect(result.roundResult?.values.yellow).toBe(30)
  })

  it('uses clockwise priority to break sealed bid ties', () => {
    const game = startGame({ aiCount: 2, seed: 'sealed-tie' })
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
  })

  it('tracks public bids and pass states while rejecting bids above available cash', () => {
    const game = startGame({ aiCount: 2, seed: 'visible-bid-status' })
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
    const auctionCard = card('red', 'fixed-price')
    game.players[0]!.hand = [auctionCard]
    let state = playCard(game, 'human', auctionCard.id)
    state = setFixedPrice(state, 'human', 20)
    state = respondToFixedPrice(state, 'ai-1', false)
    state = respondToFixedPrice(state, 'ai-2', false)

    expect(state.players[0]?.cash).toBe(80)
    expect(state.players[0]?.gallery).toHaveLength(1)
    expect(state.phase).toBe('select-card')
  })

  it('splits joint auction revenue and gives odd remainder to the second provider', () => {
    const game = startGame({ aiCount: 2, seed: 'joint-split' })
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
    state = passBid(state, 'ai-1')
    state = placeBid(state, 'ai-2', 11)
    state = passBid(state, 'human')

    expect(state.players.find((player) => player.id === 'human')?.cash).toBe(105)
    expect(state.players.find((player) => player.id === 'ai-1')?.cash).toBe(106)
    expect(state.players.find((player) => player.id === 'ai-2')?.cash).toBe(89)
    expect(state.players.find((player) => player.id === 'ai-2')?.gallery).toHaveLength(2)
    expect(state.lastAuctionResult).toMatchObject({
      winnerId: 'ai-2',
      amount: 11,
      cardCount: 2,
    })
  })

  it('records each artwork sold to the bank before clearing player galleries', () => {
    const game = startGame({ aiCount: 2, seed: 'round-sales' })
    const soldCard = card('yellow', 'sealed')
    const finishingCard = card('yellow', 'open')
    game.players[0]!.gallery = [{ card: soldCard, acquisition: 'auction', sellableThisRound: true }]
    game.players[0]!.hand = [finishingCard]
    game.roundCounts.yellow = 4

    const result = playCard(game, 'human', finishingCard.id)

    expect(result.roundResult?.sales?.human).toEqual([{ card: soldCard, unitPrice: 30 }])
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
