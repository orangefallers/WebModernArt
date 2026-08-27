import { reactive, readonly } from 'vue'
import { z } from 'zod'
import { ARTIST_IDS, type ArtistId } from '@/domain/model'
import { ARTISTS } from '@/config/game-rules'

const SETTINGS_KEY = 'modern-art:solo:settings:v1'
const VALID_ARTIST_NAME = /^[A-Za-z\p{Script=Han}]+$/u

export const DEFAULT_ARTIST_NAMES: Record<ArtistId, string> = Object.fromEntries(
  ARTIST_IDS.map((artistId) => [artistId, ARTISTS[artistId].zhName]),
) as Record<ArtistId, string>

const artistNamesSchema = z.object({
  yellow: z.string(),
  blue: z.string(),
  red: z.string(),
  green: z.string(),
  brown: z.string(),
})

function loadArtistNames(): Record<ArtistId, string> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_ARTIST_NAMES }
    const parsed = artistNamesSchema.safeParse(JSON.parse(raw)?.artistNames)
    if (!parsed.success) return { ...DEFAULT_ARTIST_NAMES }
    const names = parsed.data as Record<ArtistId, string>
    return ARTIST_IDS.every((artistId) => validateArtistName(names[artistId]) === '')
      ? names
      : { ...DEFAULT_ARTIST_NAMES }
  } catch {
    return { ...DEFAULT_ARTIST_NAMES }
  }
}

const artistNames = reactive<Record<ArtistId, string>>(loadArtistNames())

export function validateArtistName(value: string): string {
  const normalized = value.trim()
  if (!normalized) return '請輸入藝術家名稱。'
  if (Array.from(normalized).length > 10) return '名稱最多 10 個字。'
  if (!VALID_ARTIST_NAME.test(normalized)) return '只能使用英文字母或中文字。'
  return ''
}

export function saveArtistNames(values: Record<ArtistId, string>): boolean {
  const normalized = Object.fromEntries(
    ARTIST_IDS.map((artistId) => [artistId, values[artistId].trim()]),
  ) as Record<ArtistId, string>
  if (ARTIST_IDS.some((artistId) => validateArtistName(normalized[artistId]) !== '')) return false
  Object.assign(artistNames, normalized)
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ artistNames: normalized }))
  return true
}

export function restoreDefaultArtistNames(): void {
  saveArtistNames({ ...DEFAULT_ARTIST_NAMES })
}

export function artistDisplayName(artistId: ArtistId): string {
  return artistNames[artistId]
}

export function useArtistSettings() {
  return { artistNames: readonly(artistNames) }
}
