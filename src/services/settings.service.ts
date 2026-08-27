import { reactive, readonly } from 'vue'
import { z } from 'zod'
import { ARTIST_IDS, PERSONALITY_IDS, type ArtistId, type Personality } from '@/domain/model'
import { ARTISTS } from '@/config/game-rules'

const SETTINGS_KEY = 'modern-art:solo:settings:v1'
const VALID_ARTIST_NAME = /^[A-Za-z\p{Script=Han}]+$/u

export interface AIPlayerSetting {
  name: string
  personality: Personality
}

export const DEFAULT_ARTIST_NAMES: Record<ArtistId, string> = Object.fromEntries(
  ARTIST_IDS.map((artistId) => [artistId, ARTISTS[artistId].zhName]),
) as Record<ArtistId, string>

export const DEFAULT_AI_SETTINGS: AIPlayerSetting[] = PERSONALITY_IDS.map((personality, index) => ({
  name: `AI 畫商 ${index + 1}`,
  personality,
}))

const artistNamesSchema = z.object({
  yellow: z.string(),
  blue: z.string(),
  red: z.string(),
  green: z.string(),
  brown: z.string(),
})

const aiSettingsSchema = z.array(
  z.object({
    name: z.string(),
    personality: z.enum(PERSONALITY_IDS),
  }),
)

function defaultAISettings(): AIPlayerSetting[] {
  return DEFAULT_AI_SETTINGS.map((setting) => ({ ...setting }))
}

function loadSettings(): {
  artistNames: Record<ArtistId, string>
  aiSettings: AIPlayerSetting[]
} {
  const defaults = {
    artistNames: { ...DEFAULT_ARTIST_NAMES },
    aiSettings: defaultAISettings(),
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaults
    const stored = JSON.parse(raw) as unknown
    const artistResult = artistNamesSchema.safeParse(
      typeof stored === 'object' && stored ? Reflect.get(stored, 'artistNames') : undefined,
    )
    const aiResult = aiSettingsSchema.safeParse(
      typeof stored === 'object' && stored ? Reflect.get(stored, 'aiSettings') : undefined,
    )
    const loadedArtistNames = artistResult.success
      ? (artistResult.data as Record<ArtistId, string>)
      : defaults.artistNames
    const loadedAISettings =
      aiResult.success && aiResult.data.length === 4 ? aiResult.data : defaults.aiSettings

    return {
      artistNames: ARTIST_IDS.every(
        (artistId) => validateArtistName(loadedArtistNames[artistId]) === '',
      )
        ? loadedArtistNames
        : defaults.artistNames,
      aiSettings: loadedAISettings.every((setting) => validatePlayerName(setting.name) === '')
        ? loadedAISettings
        : defaults.aiSettings,
    }
  } catch {
    return defaults
  }
}

const loadedSettings = loadSettings()
const artistNames = reactive<Record<ArtistId, string>>(loadedSettings.artistNames)
const aiSettings = reactive<AIPlayerSetting[]>(loadedSettings.aiSettings)

function persistSettings(): void {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      artistNames: { ...artistNames },
      aiSettings: aiSettings.map((setting) => ({ ...setting })),
    }),
  )
}

export function validateArtistName(value: string): string {
  const normalized = value.trim()
  if (!normalized) return '請輸入藝術家名稱。'
  if (Array.from(normalized).length > 10) return '名稱最多 10 個字。'
  if (!VALID_ARTIST_NAME.test(normalized)) return '只能使用英文字母或中文字。'
  return ''
}

export function validatePlayerName(value: string): string {
  const normalized = value.trim()
  if (!normalized) return '請輸入名稱。'
  if (Array.from(normalized).length > 20) return '名稱最多 20 個字。'
  return ''
}

export function saveArtistNames(values: Record<ArtistId, string>): boolean {
  const normalized = Object.fromEntries(
    ARTIST_IDS.map((artistId) => [artistId, values[artistId].trim()]),
  ) as Record<ArtistId, string>
  if (ARTIST_IDS.some((artistId) => validateArtistName(normalized[artistId]) !== '')) return false
  Object.assign(artistNames, normalized)
  persistSettings()
  return true
}

export function saveAISettings(values: AIPlayerSetting[]): boolean {
  if (
    values.length !== 4 ||
    values.some(
      (setting) =>
        validatePlayerName(setting.name) !== '' || !PERSONALITY_IDS.includes(setting.personality),
    )
  ) {
    return false
  }
  aiSettings.splice(
    0,
    aiSettings.length,
    ...values.map((setting) => ({ ...setting, name: setting.name.trim() })),
  )
  persistSettings()
  return true
}

export function restoreDefaultArtistNames(): void {
  saveArtistNames({ ...DEFAULT_ARTIST_NAMES })
}

export function restoreDefaultAISettings(): void {
  saveAISettings(defaultAISettings())
}

export function artistDisplayName(artistId: ArtistId): string {
  return artistNames[artistId]
}

export function getAISettings(): AIPlayerSetting[] {
  return aiSettings.map((setting) => ({ ...setting }))
}

export function useArtistSettings() {
  return { artistNames: readonly(artistNames) }
}

export function useAISettings() {
  return { aiSettings: readonly(aiSettings) }
}
