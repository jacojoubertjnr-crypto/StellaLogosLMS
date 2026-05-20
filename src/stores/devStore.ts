import { create } from 'zustand'

const STORAGE_KEY = 'sl_dev_ai_bots'

interface DevState {
  aiBotsEnabled: boolean
  toggleAiBots: () => void
}

export const useDevStore = create<DevState>((set) => ({
  aiBotsEnabled: localStorage.getItem(STORAGE_KEY) === 'true',
  toggleAiBots: () =>
    set((s) => {
      const next = !s.aiBotsEnabled
      localStorage.setItem(STORAGE_KEY, String(next))
      return { aiBotsEnabled: next }
    }),
}))
