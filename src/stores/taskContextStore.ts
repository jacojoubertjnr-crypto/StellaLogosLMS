import { create } from 'zustand'

interface TaskContextState {
  phase: number       // 0 = not in a task
  tab: string         // 'resources' | 'quiz' | ''
  role: string        // phase 3 role: 'leader' | 'timer' | 'scribe' | 'angle-checker' | 'learner' | ''
  setTaskContext: (phase: number, tab?: string) => void
  setRole: (role: string) => void
  clearTaskContext: () => void
}

export const useTaskContextStore = create<TaskContextState>((set) => ({
  phase: 0,
  tab: '',
  role: '',
  setTaskContext: (phase, tab = '') => set({ phase, tab }),
  setRole: (role) => set({ role }),
  clearTaskContext: () => set({ phase: 0, tab: '', role: '' }),
}))
