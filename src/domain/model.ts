export const ARTIST_IDS = ['yellow', 'blue', 'red', 'green', 'brown'] as const
export const AUCTION_TYPES = ['open', 'once-around', 'sealed', 'fixed-price', 'double'] as const
export const PERSONALITY_IDS = ['conservative', 'balanced', 'aggressive', 'chaotic'] as const

export type ArtistId = (typeof ARTIST_IDS)[number]
export type AuctionType = (typeof AUCTION_TYPES)[number]
export type PlayerId = string
export type Money = number

export interface ArtistDefinition {
  id: ArtistId
  name: string
  zhName: string
  color: string
  ink: string
  priority: number
  totalCards: number
}

export interface ArtworkCard {
  id: string
  artistId: ArtistId
  auctionType: AuctionType
  edition: number
}

export type Personality = (typeof PERSONALITY_IDS)[number]

export interface GalleryEntry {
  card: ArtworkCard
  acquisition: 'auction' | 'unmatched-double'
  sellableThisRound: boolean
  /** Optional so saves created before acquisition costs were introduced still load safely. */
  purchasePrice?: Money
}

export interface PlayerState {
  id: PlayerId
  name: string
  kind: 'human' | 'ai'
  cash: Money
  hand: ArtworkCard[]
  gallery: GalleryEntry[]
  personality?: Personality
}

export type GamePhase = 'select-card' | 'double-response' | 'auction' | 'round-result' | 'game-over'

export interface MarketRound {
  round: number
  values: Record<ArtistId, Money>
  counts: Record<ArtistId, number>
}

export interface ArtworkSale {
  card: ArtworkCard
  unitPrice: Money
}

export interface ArtworkRoundResult {
  card: ArtworkCard
  acquisition: GalleryEntry['acquisition']
  sellableThisRound: boolean
  purchasePrice?: Money
  bankSalePrice?: Money
}

export interface RoundResult {
  round: number
  ranking: ArtistId[]
  values: Record<ArtistId, Money>
  counts: Record<ArtistId, number>
  earnings: Record<PlayerId, Money>
  /** Optional so saves created before sale details were introduced still load safely. */
  sales?: Record<PlayerId, ArtworkSale[]>
  /** Optional so saves created before complete artwork settlement details still load safely. */
  artworks?: Record<PlayerId, ArtworkRoundResult[]>
  /** Optional so saves created before the next-round preview was introduced still load safely. */
  nextAuctioneerId?: PlayerId
}

export interface GameLogEntry {
  id: number
  message: string
  /** Optional so saves created before round labels were introduced still load safely. */
  round?: number
  tone?: 'neutral' | 'bid' | 'sale' | 'round' | 'win'
}

export interface PendingDouble {
  primaryCard: ArtworkCard
  primaryAuctioneerId: PlayerId
  responderOrder: PlayerId[]
  responderIndex: number
}

export interface AuctionState {
  type: Exclude<AuctionType, 'double'>
  cards: ArtworkCard[]
  primaryAuctioneerId: PlayerId
  secondaryAuctioneerId?: PlayerId
  turnOrder: PlayerId[]
  turnIndex: number
  highestBid: Money
  highestBidderId?: PlayerId
  passedPlayerIds: PlayerId[]
  bids: Partial<Record<PlayerId, Money>>
  fixedPrice?: Money
  priceSetterId?: PlayerId
}

export interface AuctionPayout {
  playerId: PlayerId
  role: 'primary' | 'secondary'
  amount: Money
}

export interface AuctionResult {
  id: number
  /** Optional so saves created before unmatched Double results were introduced still load safely. */
  kind?: 'auction' | 'unmatched-double'
  /** Optional so saves created before rich auction result cards were introduced still load safely. */
  round?: 1 | 2 | 3 | 4
  auctionType?: AuctionType
  cards?: ArtworkCard[]
  winnerId: PlayerId
  amount: Money
  cardCount: number
  /** Optional so saves created before settlement details were introduced still load safely. */
  payouts?: AuctionPayout[]
  bankPayment?: Money
}

export interface GameState {
  schemaVersion: 1
  seed: string
  rngState: number
  phase: GamePhase
  round: 1 | 2 | 3 | 4
  players: PlayerState[]
  auctioneerIndex: number
  deck: ArtworkCard[]
  roundCounts: Record<ArtistId, number>
  marketHistory: MarketRound[]
  pendingDouble: PendingDouble | null
  auction: AuctionState | null
  /** Optional so saves created before winner notifications were introduced still load safely. */
  lastAuctionResult?: AuctionResult
  roundResult: RoundResult | null
  lastRoundEndPlayerId?: PlayerId
  log: GameLogEntry[]
  nextLogId: number
}

export interface StartGameOptions {
  aiCount: 2 | 3 | 4
  seed?: string
  humanName?: string
  aiPlayers?: Array<{ name: string; personality: Personality }>
}

export class GameRuleError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'GameRuleError'
  }
}
