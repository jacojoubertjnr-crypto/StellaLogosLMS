import { create } from 'zustand'

// Always starts OFF — must be explicitly enabled each session
interface DevState {
  aiBotsEnabled: boolean
  setAiBots: (enabled: boolean) => void
}

export const useDevStore = create<DevState>((set) => ({
  aiBotsEnabled: false,
  setAiBots: (enabled) => set({ aiBotsEnabled: enabled }),
}))
