import {
  ARTIST_IDS,
  type ArtistId,
  type AuctionState,
  type ArtworkCard,
  type GameState,
  type Money,
  type PlayerId,
  type PlayerState,
  type RoundResult,
  type StartGameOptions,
  GameRuleError,
} from './model'
import { createDeck } from './deck'
import { hashSeed, shuffleCards } from './random'
import {
  ARTISTS,
  INITIAL_CASH,
  INITIAL_HAND_SIZE,
  MARKET_AWARDS,
  REFILL_HAND_SIZE,
} from '@/config/game-rules'

const personalities = ['conservative', 'balanced', 'aggressive', 'chaotic'] as const

function emptyArtistNumbers(): Record<ArtistId, number> {
  return { yellow: 0, blue: 0, red: 0, green: 0, brown: 0 }
}

function clone(state: GameState): GameState {
  return structuredClone(state)
}

function playerById(state: GameState, playerId: PlayerId): PlayerState {
  const player = state.players.find((candidate) => candidate.id === playerId)
  if (!player) throw new GameRuleError('PLAYER_NOT_FOUND', '找不到玩家。')
  return player
}

function log(
  state: GameState,
  message: string,
  tone: 'neutral' | 'bid' | 'sale' | 'round' = 'neutral',
): void {
  state.log.push({ id: state.nextLogId, message, tone })
  state.nextLogId += 1
  if (state.log.length > 80) state.log.splice(0, state.log.length - 80)
}

function clockwiseOrder(
  state: GameState,
  afterPlayerId: PlayerId,
  includeStart = false,
): PlayerId[] {
  const startIndex = state.players.findIndex((player) => player.id === afterPlayerId)
  if (startIndex < 0) return []
  const result: PlayerId[] = []
  const startOffset = includeStart ? 0 : 1
  for (let offset = startOffset; offset < state.players.length + startOffset; offset += 1) {
    const player = state.players[(startIndex + offset) % state.players.length]
    if (player && !result.includes(player.id)) result.push(player.id)
  }
  return result
}

function drawToPlayers(state: GameState, countPerPlayer: number): void {
  for (let draw = 0; draw < countPerPlayer; draw += 1) {
    for (const player of state.players) {
      const card = state.deck.pop()
      if (card) player.hand.push(card)
    }
  }
}

export function startGame(options: StartGameOptions): GameState {
  const seed = options.seed ?? `${Date.now()}-${Math.random()}`
  const [deck, rngState] = shuffleCards(createDeck(), hashSeed(seed))
  const players: PlayerState[] = [
    { id: 'human', name: '你的藝廊', kind: 'human', cash: INITIAL_CASH, hand: [], gallery: [] },
  ]

  for (let index = 0; index < options.aiCount; index += 1) {
    const personality = personalities[index % personalities.length] ?? 'balanced'
    players.push({
      id: `ai-${index + 1}`,
      name: `AI 畫商 ${index + 1}`,
      kind: 'ai',
      cash: INITIAL_CASH,
      hand: [],
      gallery: [],
      personality,
    })
  }

  const state: GameState = {
    schemaVersion: 1,
    seed,
    rngState,
    phase: 'select-card',
    round: 1,
    players,
    auctioneerIndex: 0,
    deck,
    roundCounts: emptyArtistNumbers(),
    marketHistory: [],
    pendingDouble: null,
    auction: null,
    roundResult: null,
    log: [],
    nextLogId: 1,
  }

  drawToPlayers(state, INITIAL_HAND_SIZE[players.length as 3 | 4 | 5])
  log(state, `第 1 輪開始。每位畫商帶著 $${INITIAL_CASH}k 進場。`, 'round')
  return state
}

function removeCard(player: PlayerState, cardId: string): ArtworkCard {
  const index = player.hand.findIndex((card) => card.id === cardId)
  if (index < 0) throw new GameRuleError('CARD_NOT_IN_HAND', '這張畫作不在你的手牌中。')
  const [card] = player.hand.splice(index, 1)
  if (!card) throw new GameRuleError('CARD_NOT_IN_HAND', '無法取得這張畫作。')
  return card
}

function scoreRound(state: GameState): void {
  const ranking = [...ARTIST_IDS].sort((left, right) => {
    const countDifference = state.roundCounts[right] - state.roundCounts[left]
    return countDifference || ARTISTS[left].priority - ARTISTS[right].priority
  })
  const values = emptyArtistNumbers()
  ranking.slice(0, 3).forEach((artistId, index) => {
    if (state.roundCounts[artistId] > 0) values[artistId] = MARKET_AWARDS[index] ?? 0
  })

  const historicalValues = emptyArtistNumbers()
  for (const marketRound of state.marketHistory) {
    for (const artistId of ARTIST_IDS) historicalValues[artistId] += marketRound.values[artistId]
  }

  const earnings: Record<PlayerId, Money> = {}
  for (const player of state.players) {
    let earned = 0
    for (const entry of player.gallery) {
      const currentValue = values[entry.card.artistId]
      if (entry.sellableThisRound && currentValue > 0) {
        earned += currentValue + historicalValues[entry.card.artistId]
      }
    }
    player.cash += earned
    player.gallery = []
    earnings[player.id] = earned
    log(state, `${player.name} 本輪售畫收入 $${earned}k。`, 'sale')
  }

  state.marketHistory.push({
    round: state.round,
    values: { ...values },
    counts: { ...state.roundCounts },
  })
  const result: RoundResult = {
    round: state.round,
    ranking,
    values,
    counts: { ...state.roundCounts },
    earnings,
  }
  state.roundResult = result
  state.phase = 'round-result'
  state.auction = null
  state.pendingDouble = null
  log(state, `第 ${state.round} 輪落幕，市場完成結算。`, 'round')
}

function registerPlayedCard(state: GameState, card: ArtworkCard, playerId: PlayerId): boolean {
  state.roundCounts[card.artistId] += 1
  const player = playerById(state, playerId)
  log(state, `${player.name} 推出 ${ARTISTS[card.artistId].zhName} 的作品。`)
  if (state.roundCounts[card.artistId] >= 5) {
    state.lastRoundEndPlayerId = playerId
    log(state, `${ARTISTS[card.artistId].zhName} 的第 5 張作品登場，本輪立即結束！`, 'round')
    scoreRound(state)
    return true
  }
  return false
}

function createAuction(
  state: GameState,
  cards: ArtworkCard[],
  primaryAuctioneerId: PlayerId,
  secondaryAuctioneerId?: PlayerId,
): void {
  const determiningCard = cards[cards.length - 1]
  if (!determiningCard || determiningCard.auctionType === 'double') {
    throw new GameRuleError('INVALID_AUCTION_CARD', '聯合拍賣需要另一張非聯合拍賣牌。')
  }
  const type = determiningCard.auctionType
  let turnOrder = clockwiseOrder(state, primaryAuctioneerId)
  const priceSetterId = secondaryAuctioneerId ?? primaryAuctioneerId

  if (type === 'fixed-price') {
    turnOrder = clockwiseOrder(state, priceSetterId).filter(
      (id) => id !== primaryAuctioneerId && id !== secondaryAuctioneerId,
    )
  }

  const auction: AuctionState = {
    type,
    cards,
    primaryAuctioneerId,
    secondaryAuctioneerId,
    turnOrder,
    turnIndex: 0,
    highestBid: 0,
    passedPlayerIds: [],
    bids: {},
    priceSetterId,
  }
  state.auction = auction
  state.phase = 'auction'
  log(
    state,
    `拍賣開始：${cards.length} 張作品，${type === 'open' ? '公開競價' : type === 'once-around' ? '一圈競價' : type === 'sealed' ? '密封出價' : '定價拍賣'}。`,
  )
}

export function playCard(inputState: GameState, playerId: PlayerId, cardId: string): GameState {
  const state = clone(inputState)
  if (state.phase !== 'select-card') throw new GameRuleError('ACTION_NOT_ALLOWED', '現在不能出牌。')
  const auctioneer = state.players[state.auctioneerIndex]
  if (!auctioneer || auctioneer.id !== playerId) {
    throw new GameRuleError('NOT_AUCTIONEER', '現在不是這位玩家擔任拍賣官。')
  }
  const card = removeCard(auctioneer, cardId)
  if (registerPlayedCard(state, card, playerId)) return state

  if (card.auctionType === 'double') {
    state.pendingDouble = {
      primaryCard: card,
      primaryAuctioneerId: playerId,
      responderOrder: clockwiseOrder(state, playerId, true),
      responderIndex: 0,
    }
    state.phase = 'double-response'
    log(state, '聯合拍賣：等待同藝術家的第二張作品。')
  } else {
    createAuction(state, [card], playerId)
  }
  return state
}

function advanceAuctioneer(state: GameState): void {
  state.auctioneerIndex = (state.auctioneerIndex + 1) % state.players.length
  state.auction = null
  state.pendingDouble = null
  state.phase = 'select-card'
}

export function respondToDouble(
  inputState: GameState,
  playerId: PlayerId,
  cardId?: string,
): GameState {
  const state = clone(inputState)
  const pending = state.pendingDouble
  if (state.phase !== 'double-response' || !pending) {
    throw new GameRuleError('ACTION_NOT_ALLOWED', '現在不是聯合拍賣補牌階段。')
  }
  const responderId = pending.responderOrder[pending.responderIndex]
  if (responderId !== playerId) throw new GameRuleError('NOT_YOUR_TURN', '尚未輪到這位玩家補牌。')

  if (cardId) {
    const player = playerById(state, playerId)
    const candidate = player.hand.find((card) => card.id === cardId)
    if (
      !candidate ||
      candidate.artistId !== pending.primaryCard.artistId ||
      candidate.auctionType === 'double'
    ) {
      throw new GameRuleError('INVALID_DOUBLE_CARD', '只能補同藝術家的非聯合拍賣牌。')
    }
    const secondCard = removeCard(player, cardId)
    if (registerPlayedCard(state, secondCard, playerId)) return state
    createAuction(
      state,
      [pending.primaryCard, secondCard],
      pending.primaryAuctioneerId,
      playerId === pending.primaryAuctioneerId ? undefined : playerId,
    )
    return state
  }

  pending.responderIndex += 1
  if (pending.responderIndex >= pending.responderOrder.length) {
    const owner = playerById(state, pending.primaryAuctioneerId)
    owner.gallery.push({
      card: pending.primaryCard,
      acquisition: 'unmatched-double',
      sellableThisRound: false,
    })
    log(state, `${owner.name} 免費收下未配對的聯合拍賣作品。`, 'sale')
    advanceAuctioneer(state)
  } else {
    log(state, `${playerById(state, playerId).name} 選擇不補牌。`)
  }
  return state
}

function settleAuction(state: GameState, winnerId: PlayerId, amount: Money): void {
  const auction = state.auction
  if (!auction) throw new GameRuleError('NO_AUCTION', '目前沒有拍賣。')
  const winner = playerById(state, winnerId)
  if (amount < 0 || amount > winner.cash) {
    throw new GameRuleError('BID_EXCEEDS_CASH', '成交價超出得標者可用現金。')
  }

  winner.cash -= amount
  if (auction.secondaryAuctioneerId) {
    const secondaryShare = Math.ceil(amount / 2)
    const primaryShare = amount - secondaryShare
    playerById(state, auction.primaryAuctioneerId).cash += primaryShare
    playerById(state, auction.secondaryAuctioneerId).cash += secondaryShare
  } else if (winnerId !== auction.primaryAuctioneerId) {
    playerById(state, auction.primaryAuctioneerId).cash += amount
  }

  for (const card of auction.cards) {
    winner.gallery.push({ card, acquisition: 'auction', sellableThisRound: true })
  }
  log(state, `${winner.name} 以 $${amount}k 得標 ${auction.cards.length} 張作品。`, 'sale')
  advanceAuctioneer(state)
}

function finishNoBid(state: GameState): void {
  const auction = state.auction
  if (!auction) return
  settleAuction(state, auction.primaryAuctioneerId, 0)
}

function advanceOpenTurn(state: GameState): void {
  const auction = state.auction
  if (!auction) return
  const active = auction.turnOrder.filter((id) => !auction.passedPlayerIds.includes(id))
  if (auction.highestBidderId && active.every((id) => id === auction.highestBidderId)) {
    settleAuction(state, auction.highestBidderId, auction.highestBid)
    return
  }
  if (!auction.highestBidderId && active.length === 0) {
    finishNoBid(state)
    return
  }
  for (let steps = 0; steps < auction.turnOrder.length; steps += 1) {
    auction.turnIndex = (auction.turnIndex + 1) % auction.turnOrder.length
    const candidate = auction.turnOrder[auction.turnIndex]
    if (candidate && !auction.passedPlayerIds.includes(candidate)) return
  }
}

export function placeBid(inputState: GameState, playerId: PlayerId, amount: Money): GameState {
  const state = clone(inputState)
  const auction = state.auction
  if (state.phase !== 'auction' || !auction || !['open', 'once-around'].includes(auction.type)) {
    throw new GameRuleError('ACTION_NOT_ALLOWED', '目前不能公開出價。')
  }
  const actorId = auction.turnOrder[auction.turnIndex]
  if (actorId !== playerId) throw new GameRuleError('NOT_YOUR_TURN', '尚未輪到這位玩家出價。')
  const player = playerById(state, playerId)
  if (!Number.isInteger(amount) || amount <= auction.highestBid || amount > player.cash) {
    throw new GameRuleError('INVALID_BID', '出價必須是高於目前價格且不超過現金的整數。')
  }
  auction.highestBid = amount
  auction.highestBidderId = playerId
  log(state, `${player.name} 出價 $${amount}k。`, 'bid')

  if (auction.type === 'once-around') {
    auction.turnIndex += 1
    if (auction.turnIndex >= auction.turnOrder.length) settleAuction(state, playerId, amount)
  } else {
    advanceOpenTurn(state)
  }
  return state
}

export function passBid(inputState: GameState, playerId: PlayerId): GameState {
  const state = clone(inputState)
  const auction = state.auction
  if (state.phase !== 'auction' || !auction || !['open', 'once-around'].includes(auction.type)) {
    throw new GameRuleError('ACTION_NOT_ALLOWED', '目前不能放棄出價。')
  }
  const actorId = auction.turnOrder[auction.turnIndex]
  if (actorId !== playerId) throw new GameRuleError('NOT_YOUR_TURN', '尚未輪到這位玩家。')
  log(state, `${playerById(state, playerId).name} 放棄出價。`)

  if (auction.type === 'once-around') {
    auction.turnIndex += 1
    if (auction.turnIndex >= auction.turnOrder.length) {
      if (auction.highestBidderId) settleAuction(state, auction.highestBidderId, auction.highestBid)
      else finishNoBid(state)
    }
  } else {
    if (!auction.passedPlayerIds.includes(playerId)) auction.passedPlayerIds.push(playerId)
    advanceOpenTurn(state)
  }
  return state
}

export function submitSealedBid(
  inputState: GameState,
  playerId: PlayerId,
  amount: Money,
): GameState {
  const state = clone(inputState)
  const auction = state.auction
  if (state.phase !== 'auction' || !auction || auction.type !== 'sealed') {
    throw new GameRuleError('ACTION_NOT_ALLOWED', '目前不是密封出價。')
  }
  const actorId = auction.turnOrder.find((id) => auction.bids[id] === undefined)
  if (actorId !== playerId) throw new GameRuleError('NOT_YOUR_TURN', '尚未輪到這位玩家提交。')
  const player = playerById(state, playerId)
  if (!Number.isInteger(amount) || amount < 0 || amount > player.cash) {
    throw new GameRuleError('INVALID_BID', '密封出價必須在可用現金範圍內。')
  }
  auction.bids[playerId] = amount
  log(state, `${player.name} 已封存出價。`)
  if (auction.turnOrder.every((id) => auction.bids[id] !== undefined)) {
    const winnerId = auction.turnOrder.reduce((winner, candidate) => {
      const winnerBid = auction.bids[winner] ?? -1
      const candidateBid = auction.bids[candidate] ?? -1
      return candidateBid > winnerBid ? candidate : winner
    })
    settleAuction(state, winnerId, auction.bids[winnerId] ?? 0)
  }
  return state
}

export function setFixedPrice(inputState: GameState, playerId: PlayerId, amount: Money): GameState {
  const state = clone(inputState)
  const auction = state.auction
  if (state.phase !== 'auction' || !auction || auction.type !== 'fixed-price') {
    throw new GameRuleError('ACTION_NOT_ALLOWED', '目前不是定價拍賣。')
  }
  if (auction.priceSetterId !== playerId || auction.fixedPrice !== undefined) {
    throw new GameRuleError('NOT_PRICE_SETTER', '這位玩家目前不能定價。')
  }
  const player = playerById(state, playerId)
  if (!Number.isInteger(amount) || amount < 0 || amount > player.cash) {
    throw new GameRuleError('INVALID_PRICE', '定價必須在拍賣官可用現金範圍內。')
  }
  auction.fixedPrice = amount
  log(state, `${player.name} 將作品定價為 $${amount}k。`, 'bid')
  if (auction.turnOrder.length === 0) settleAuction(state, playerId, amount)
  return state
}

export function respondToFixedPrice(
  inputState: GameState,
  playerId: PlayerId,
  accept: boolean,
): GameState {
  const state = clone(inputState)
  const auction = state.auction
  if (
    state.phase !== 'auction' ||
    !auction ||
    auction.type !== 'fixed-price' ||
    auction.fixedPrice === undefined
  ) {
    throw new GameRuleError('ACTION_NOT_ALLOWED', '目前不能回應定價。')
  }
  const actorId = auction.turnOrder[auction.turnIndex]
  if (actorId !== playerId) throw new GameRuleError('NOT_YOUR_TURN', '尚未輪到這位玩家回應。')
  const player = playerById(state, playerId)
  if (accept) {
    if (auction.fixedPrice > player.cash) throw new GameRuleError('INSUFFICIENT_CASH', '現金不足。')
    settleAuction(state, playerId, auction.fixedPrice)
  } else {
    log(state, `${player.name} 拒絕定價。`)
    auction.turnIndex += 1
    if (auction.turnIndex >= auction.turnOrder.length) {
      settleAuction(state, auction.priceSetterId ?? auction.primaryAuctioneerId, auction.fixedPrice)
    }
  }
  return state
}

export function continueAfterRound(inputState: GameState): GameState {
  const state = clone(inputState)
  if (state.phase !== 'round-result')
    throw new GameRuleError('ACTION_NOT_ALLOWED', '目前沒有待確認的結算。')
  if (state.round === 4) {
    state.phase = 'game-over'
    state.roundResult = null
    log(state, '四輪拍賣全部結束。最富有的畫商獲勝！', 'round')
    return state
  }

  const endingPlayerIndex = state.players.findIndex(
    (player) => player.id === state.lastRoundEndPlayerId,
  )
  state.auctioneerIndex =
    endingPlayerIndex >= 0 ? (endingPlayerIndex + 1) % state.players.length : 0
  state.round = (state.round + 1) as 2 | 3 | 4
  state.roundCounts = emptyArtistNumbers()
  state.roundResult = null
  drawToPlayers(state, state.round === 4 ? 0 : REFILL_HAND_SIZE[state.players.length as 3 | 4 | 5])
  state.phase = 'select-card'
  log(state, `第 ${state.round} 輪開始。`, 'round')
  return state
}

export function skipEmptyAuctioneer(inputState: GameState, playerId: PlayerId): GameState {
  const state = clone(inputState)
  const auctioneer = state.players[state.auctioneerIndex]
  if (state.phase !== 'select-card' || !auctioneer || auctioneer.id !== playerId) {
    throw new GameRuleError('ACTION_NOT_ALLOWED', '現在不能跳過拍賣官。')
  }
  if (auctioneer.hand.length > 0) {
    throw new GameRuleError('HAND_NOT_EMPTY', '仍有手牌時不能跳過。')
  }
  log(state, `${auctioneer.name} 已無手牌，本次略過。`)
  advanceAuctioneer(state)
  return state
}

export function currentActorId(state: GameState): PlayerId | undefined {
  if (state.phase === 'select-card') return state.players[state.auctioneerIndex]?.id
  if (state.phase === 'double-response') {
    return state.pendingDouble?.responderOrder[state.pendingDouble.responderIndex]
  }
  if (state.phase !== 'auction' || !state.auction) return undefined
  const auction = state.auction
  if (auction.type === 'sealed')
    return auction.turnOrder.find((id) => auction.bids[id] === undefined)
  if (auction.type === 'fixed-price' && auction.fixedPrice === undefined)
    return auction.priceSetterId
  return auction.turnOrder[auction.turnIndex]
}

export function validDoubleCards(state: GameState, playerId: PlayerId): ArtworkCard[] {
  const pending = state.pendingDouble
  if (!pending) return []
  return playerById(state, playerId).hand.filter(
    (card) => card.artistId === pending.primaryCard.artistId && card.auctionType !== 'double',
  )
}

export function cumulativeMarketValue(state: GameState, artistId: ArtistId): Money {
  return state.marketHistory.reduce((sum, marketRound) => sum + marketRound.values[artistId], 0)
}
