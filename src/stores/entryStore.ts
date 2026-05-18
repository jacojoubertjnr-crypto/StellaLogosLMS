import { create } from 'zustand'

type Section = 'timetable' | 'chat'

interface EntryStore {
  isTimetableOpen: boolean
  isChatOpen: boolean
  toggleSection: (section: Section) => void
}

export const useEntryStore = create<EntryStore>((set, get) => ({
  isTimetableOpen: false,
  isChatOpen: false,
  toggleSection: (section) => {
    const isOpen = get()[`is${section.charAt(0).toUpperCase()}${section.slice(1)}Open` as keyof EntryStore] as boolean
    set({
      isTimetableOpen: !isOpen && section === 'timetable',
      isChatOpen:      !isOpen && section === 'chat',
    })
  },
}))
