import type { ArtistDefinition, ArtistId, AuctionType, Personality } from '@/domain/model'

export const ARTISTS: Record<ArtistId, ArtistDefinition> = {
  yellow: {
    id: 'yellow',
    name: 'Carvalho',
    zhName: '卡瓦略',
    color: '#f3c344',
    ink: '#252014',
    priority: 1,
    totalCards: 12,
  },
  blue: {
    id: 'blue',
    name: 'Thaler',
    zhName: '塔勒',
    color: '#4b7ac8',
    ink: '#f7f4ea',
    priority: 2,
    totalCards: 13,
  },
  red: {
    id: 'red',
    name: 'Melim',
    zhName: '梅林',
    color: '#d95246',
    ink: '#fff8e9',
    priority: 3,
    totalCards: 14,
  },
  green: {
    id: 'green',
    name: 'Martins',
    zhName: '馬丁斯',
    color: '#3d896c',
    ink: '#f3f0df',
    priority: 4,
    totalCards: 15,
  },
  brown: {
    id: 'brown',
    name: 'Silveira',
    zhName: '席爾維拉',
    color: '#8a6044',
    ink: '#fff5dc',
    priority: 5,
    totalCards: 16,
  },
}

export const DECK_MATRIX: Record<ArtistId, Record<AuctionType, number>> = {
  yellow: { open: 3, 'once-around': 3, sealed: 2, 'fixed-price': 2, double: 2 },
  blue: { open: 3, 'once-around': 2, sealed: 3, 'fixed-price': 3, double: 2 },
  red: { open: 3, 'once-around': 3, sealed: 3, 'fixed-price': 3, double: 2 },
  green: { open: 3, 'once-around': 3, sealed: 3, 'fixed-price': 3, double: 3 },
  brown: { open: 4, 'once-around': 3, sealed: 3, 'fixed-price': 3, double: 3 },
}

export const INITIAL_HAND_SIZE: Record<3 | 4 | 5, number> = { 3: 10, 4: 9, 5: 8 }
export const REFILL_HAND_SIZE: Record<3 | 4 | 5, number> = { 3: 6, 4: 4, 5: 3 }
export const MARKET_AWARDS = [30, 20, 10] as const
export const INITIAL_CASH = 100

export const PERSONALITY_LABELS: Record<Personality, string> = {
  conservative: '保守派',
  balanced: '鑑賞家',
  aggressive: '投機客',
  chaotic: '前衛派',
}

export const AUCTION_LABELS: Record<AuctionType, string> = {
  open: '公開競價',
  'once-around': '一圈競價',
  sealed: '密封出價',
  'fixed-price': '定價拍賣',
  double: '聯合拍賣',
}

export const AUCTION_SYMBOLS: Record<AuctionType, string> = {
  open: '◆',
  'once-around': '↻',
  sealed: '●',
  'fixed-price': '$',
  double: 'Ⅱ',
}
