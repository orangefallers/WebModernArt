import { ARTISTS, MARKET_AWARDS } from '@/config/game-rules'
import { cumulativeMarketValue, validDoubleCards } from '@/domain/game-engine'
import { nextRandom } from '@/domain/random'
import type { ArtworkCard, GameState, Money, PlayerId } from '@/domain/model'

export type AIDecision =
  | { type: 'play-card'; cardId: string; rngState: number }
  | { type: 'skip-empty'; rngState: number }
  | { type: 'double'; cardId?: string; rngState: number }
  | { type: 'bid'; amount: Money; rngState: number }
  | { type: 'pass'; rngState: number }
  | { type: 'sealed'; amount: Money; rngState: number }
  | { type: 'set-price'; amount: Money; rngState: number }
  | { type: 'fixed-response'; accept: boolean; rngState: number }

const personalityFactor = {
  conservative: 0.74,
  balanced: 0.9,
  aggressive: 1.05,
  chaotic: 0.88,
} as const

function randomBetween(state: number, minimum: number, maximum: number): [number, number] {
  const [random, nextState] = nextRandom(state)
  return [minimum + random * (maximum - minimum), nextState]
}

function expectedCurrentValue(state: GameState, artistId: ArtworkCard['artistId']): number {
  const ranked = [...Object.keys(state.roundCounts)]
    .map((id) => id as ArtworkCard['artistId'])
    .sort((left, right) => {
      const projectedLeft = state.roundCounts[left] + (left === artistId ? 0.65 : 0)
      const projectedRight = state.roundCounts[right] + (right === artistId ? 0.65 : 0)
      return projectedRight - projectedLeft || ARTISTS[left].priority - ARTISTS[right].priority
    })
  const rank = ranked.indexOf(artistId)
  return [30, 20, 10, 0, 0][rank] ?? 0
}

export function artworkValuation(state: GameState, playerId: PlayerId, card: ArtworkCard): number {
  const player = state.players.find((candidate) => candidate.id === playerId)
  if (!player) return 0
  const historical = cumulativeMarketValue(state, card.artistId)
  const expected = expectedCurrentValue(state, card.artistId)
  const owned = player.gallery.filter((entry) => entry.card.artistId === card.artistId).length
  const handSupport = player.hand.filter((entry) => entry.artistId === card.artistId).length
  const endingRisk = state.roundCounts[card.artistId] >= 4 ? 0.76 : 1
  return Math.max(0, (historical + expected + owned * 4 + handSupport * 1.5) * endingRisk)
}

function maxWillingPrice(state: GameState, playerId: PlayerId, cards: ArtworkCard[]): number {
  const player = state.players.find((candidate) => candidate.id === playerId)
  if (!player) return 0
  const factor = personalityFactor[player.personality ?? 'balanced']
  const total = cards.reduce((sum, card) => sum + artworkValuation(state, playerId, card), 0)
  const maximumResaleValue = cards.reduce(
    (sum, card) => sum + cumulativeMarketValue(state, card.artistId) + MARKET_AWARDS[0],
    0,
  )
  return Math.min(player.cash, maximumResaleValue, Math.max(0, Math.floor(total * factor)))
}

function chooseCard(state: GameState, playerId: PlayerId, rngState: number): [ArtworkCard, number] {
  const player = state.players.find((candidate) => candidate.id === playerId)
  if (!player || player.hand.length === 0) throw new Error('AI has no card to choose')
  let nextState = rngState
  const scored = player.hand.map((card) => {
    const [noise, updatedState] = randomBetween(nextState, -3, 3)
    nextState = updatedState
    const currentCount = state.roundCounts[card.artistId]
    const owned = player.gallery.filter((entry) => entry.card.artistId === card.artistId).length
    const fifthPenalty = currentCount >= 4 && owned === 0 ? 35 : 0
    const portfolioBoost = owned * 8 + currentCount * 3
    const cashPressure =
      player.cash < 35 && ['open', 'fixed-price'].includes(card.auctionType) ? 8 : 0
    const doubleBoost = card.auctionType === 'double' ? 3 : 0
    return { card, score: portfolioBoost + cashPressure + doubleBoost - fifthPenalty + noise }
  })
  scored.sort((left, right) => right.score - left.score)
  return [scored[0]?.card ?? player.hand[0]!, nextState]
}

export function decideAI(state: GameState, playerId: PlayerId): AIDecision {
  let rngState = state.rngState
  const player = state.players.find((candidate) => candidate.id === playerId)
  if (!player) throw new Error('AI player not found')

  if (state.phase === 'select-card') {
    if (player.hand.length === 0) return { type: 'skip-empty', rngState }
    const [card, nextState] = chooseCard(state, playerId, rngState)
    return { type: 'play-card', cardId: card.id, rngState: nextState }
  }

  if (state.phase === 'double-response') {
    const candidates = validDoubleCards(state, playerId)
    if (candidates.length === 0) return { type: 'double', rngState }
    const pending = state.pendingDouble
    const beneficial = pending
      ? state.roundCounts[pending.primaryCard.artistId] < 4 ||
        player.gallery.some((entry) => entry.card.artistId === pending.primaryCard.artistId)
      : false
    const [chance, nextState] = randomBetween(rngState, 0, 1)
    rngState = nextState
    if (!beneficial || chance < 0.22) return { type: 'double', rngState }
    const candidate = [...candidates].sort(
      (left, right) =>
        artworkValuation(state, playerId, left) - artworkValuation(state, playerId, right),
    )[0]
    return { type: 'double', cardId: candidate?.id, rngState }
  }

  const auction = state.auction
  if (!auction) return { type: 'pass', rngState }
  const ceiling = maxWillingPrice(state, playerId, auction.cards)

  if (auction.type === 'sealed') {
    const [variation, nextState] = randomBetween(rngState, 0.88, 1.08)
    return {
      type: 'sealed',
      amount: Math.min(player.cash, ceiling, Math.floor(ceiling * variation)),
      rngState: nextState,
    }
  }

  if (auction.type === 'fixed-price') {
    if (auction.fixedPrice === undefined) {
      const [variation, nextState] = randomBetween(rngState, 0.72, 0.94)
      return {
        type: 'set-price',
        amount: Math.min(player.cash, Math.max(0, Math.floor(ceiling * variation))),
        rngState: nextState,
      }
    }
    const [threshold, nextState] = randomBetween(rngState, 0.86, 1.04)
    return {
      type: 'fixed-response',
      accept:
        auction.fixedPrice <= Math.min(ceiling, Math.floor(ceiling * threshold)) &&
        auction.fixedPrice <= player.cash,
      rngState: nextState,
    }
  }

  const minimumBid = auction.highestBid + 1
  if (minimumBid > ceiling || minimumBid > player.cash) return { type: 'pass', rngState }
  const [increment, nextState] = randomBetween(rngState, 1, 5.999)
  const amount = Math.min(player.cash, ceiling, auction.highestBid + Math.floor(increment))
  return { type: 'bid', amount: Math.max(minimumBid, amount), rngState: nextState }
}
