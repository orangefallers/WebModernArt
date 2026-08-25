import { describe, expect, it } from 'vitest'
import { ARTIST_IDS, AUCTION_TYPES } from '@/domain/model'
import { createDeck } from '@/domain/deck'
import { DECK_MATRIX } from '@/config/game-rules'

describe('createDeck', () => {
  it('creates all 70 unique cards using the canonical matrix', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(70)
    expect(new Set(deck.map((card) => card.id)).size).toBe(70)

    for (const artistId of ARTIST_IDS) {
      for (const auctionType of AUCTION_TYPES) {
        expect(
          deck.filter((card) => card.artistId === artistId && card.auctionType === auctionType),
        ).toHaveLength(DECK_MATRIX[artistId][auctionType])
      }
    }
  })
})
