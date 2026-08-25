import { z } from 'zod'
import type { GameState } from '@/domain/model'

const SAVE_KEY = 'modern-art:solo:save:v1'

const saveSchema = z
  .object({
    schemaVersion: z.literal(1),
    seed: z.string(),
    phase: z.enum(['select-card', 'double-response', 'auction', 'round-result', 'game-over']),
    round: z.number().int().min(1).max(4),
    players: z
      .array(z.object({ id: z.string(), kind: z.enum(['human', 'ai']) }).passthrough())
      .min(3)
      .max(5),
  })
  .passthrough()

export function saveGame(state: GameState): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state))
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const parsed = saveSchema.safeParse(JSON.parse(raw))
    return parsed.success ? (parsed.data as unknown as GameState) : null
  } catch {
    return null
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY)
}

export function hasSavedGame(): boolean {
  return loadGame() !== null
}
