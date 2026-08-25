import { ARTIST_IDS, AUCTION_TYPES, type ArtworkCard } from './model'
import { DECK_MATRIX } from '@/config/game-rules'

export function createDeck(): ArtworkCard[] {
  const cards: ArtworkCard[] = []

  for (const artistId of ARTIST_IDS) {
    let edition = 1
    for (const auctionType of AUCTION_TYPES) {
      const count = DECK_MATRIX[artistId][auctionType]
      for (let index = 0; index < count; index += 1) {
        cards.push({
          id: `${artistId}-${auctionType}-${index + 1}`,
          artistId,
          auctionType,
          edition,
        })
        edition += 1
      }
    }
  }

  return cards
}
