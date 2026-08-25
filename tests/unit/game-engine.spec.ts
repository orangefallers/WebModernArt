import { describe, expect, it } from 'vitest'
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
    state = passBid(state, 'ai-1')
    state = placeBid(state, 'ai-2', 11)
    state = passBid(state, 'human')

    expect(state.players.find((player) => player.id === 'human')?.cash).toBe(105)
    expect(state.players.find((player) => player.id === 'ai-1')?.cash).toBe(106)
    expect(state.players.find((player) => player.id === 'ai-2')?.cash).toBe(89)
    expect(state.players.find((player) => player.id === 'ai-2')?.gallery).toHaveLength(2)
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
