import type { ArtworkCard } from './model'

export function hashSeed(seed: string): number {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0 || 1
}

export function nextRandom(currentState: number): [number, number] {
  const nextState = (currentState + 0x6d2b79f5) >>> 0
  let value = nextState
  value = Math.imul(value ^ (value >>> 15), value | 1)
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
  return [((value ^ (value >>> 14)) >>> 0) / 4294967296, nextState]
}

export function shuffleCards(cards: ArtworkCard[], seedState: number): [ArtworkCard[], number] {
  const result = [...cards]
  let state = seedState
  for (let index = result.length - 1; index > 0; index -= 1) {
    const [random, nextState] = nextRandom(state)
    state = nextState
    const target = Math.floor(random * (index + 1))
    const current = result[index]
    const replacement = result[target]
    if (current && replacement) {
      result[index] = replacement
      result[target] = current
    }
  }
  return [result, state]
}
