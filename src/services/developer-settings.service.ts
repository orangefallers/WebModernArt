import { reactive, readonly } from 'vue'
import { z } from 'zod'

const DEVELOPER_SETTINGS_KEY = 'modern-art:developer-settings:v1'

export interface DeveloperSettings {
  showAICash: boolean
  showPurchaseCosts: boolean
}

export const DEFAULT_DEVELOPER_SETTINGS: DeveloperSettings = {
  showAICash: true,
  showPurchaseCosts: true,
}

const developerSettingsSchema = z.object({
  showAICash: z.boolean(),
  showPurchaseCosts: z.boolean(),
})

function loadDeveloperSettings(): DeveloperSettings {
  try {
    const raw = localStorage.getItem(DEVELOPER_SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_DEVELOPER_SETTINGS }
    const parsed = developerSettingsSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : { ...DEFAULT_DEVELOPER_SETTINGS }
  } catch {
    return { ...DEFAULT_DEVELOPER_SETTINGS }
  }
}

const developerSettings = reactive<DeveloperSettings>(loadDeveloperSettings())

export function saveDeveloperSettings(values: DeveloperSettings): void {
  Object.assign(developerSettings, values)
  localStorage.setItem(DEVELOPER_SETTINGS_KEY, JSON.stringify(values))
}

export function restoreDefaultDeveloperSettings(): void {
  saveDeveloperSettings({ ...DEFAULT_DEVELOPER_SETTINGS })
}

export function useDeveloperSettings() {
  return { developerSettings: readonly(developerSettings) }
}
