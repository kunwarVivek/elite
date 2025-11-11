import { create } from 'zustand'
import { convertibleNoteApi, ConvertibleNote } from '@/lib/convertible-note-api'

interface ConvertibleNoteStore {
  notes: ConvertibleNote[]
  currentNote: ConvertibleNote | null
  maturingNotes: ConvertibleNote[]
  isLoading: boolean
  error: string | null

  fetchNotesByStartup: (startupId: string) => Promise<void>
  fetchNotesByInvestor: (investorId: string) => Promise<void>
  fetchNoteById: (id: string) => Promise<void>
  fetchMaturingNotes: (days?: number) => Promise<void>
  createNote: (data: any) => Promise<ConvertibleNote | null>
  accrueInterest: (id: string) => Promise<void>
  convertNote: (id: string, data: any) => Promise<void>
  repayNote: (id: string, amount: number) => Promise<void>
  calculateInterest: (id: string) => Promise<number | null>
  clearError: () => void
  reset: () => void
}

export const useConvertibleNoteStore = create<ConvertibleNoteStore>((set) => ({
  notes: [],
  currentNote: null,
  maturingNotes: [],
  isLoading: false,
  error: null,

  fetchNotesByStartup: async (startupId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await convertibleNoteApi.getByStartup(startupId)
      set({ notes: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchNotesByInvestor: async (investorId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await convertibleNoteApi.getByInvestor(investorId)
      set({ notes: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchNoteById: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await convertibleNoteApi.getById(id)
      set({ currentNote: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchMaturingNotes: async (days = 30) => {
    set({ isLoading: true, error: null })
    try {
      const response = await convertibleNoteApi.getMaturingNotes(days)
      set({ maturingNotes: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  createNote: async (data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await convertibleNoteApi.create(data)
      set((state) => ({
        notes: [...state.notes, response.data],
        currentNote: response.data,
        isLoading: false,
      }))
      return response.data
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      return null
    }
  },

  accrueInterest: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await convertibleNoteApi.accrueInterest(id)
      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === id ? response.data : note
        ),
        currentNote: state.currentNote?.id === id ? response.data : state.currentNote,
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  convertNote: async (id: string, data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await convertibleNoteApi.convert(id, data)
      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === id ? response.data.note : note
        ),
        currentNote: state.currentNote?.id === id ? response.data.note : state.currentNote,
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  repayNote: async (id: string, amount: number) => {
    set({ isLoading: true, error: null })
    try {
      const response = await convertibleNoteApi.repay(id, amount)
      set((state) => ({
        notes: state.notes.map((note) =>
          note.id === id ? response.data : note
        ),
        currentNote: state.currentNote?.id === id ? response.data : state.currentNote,
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  calculateInterest: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await convertibleNoteApi.calculateInterest(id)
      set({ isLoading: false })
      return response.data.accruedInterest
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      return null
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    notes: [],
    currentNote: null,
    maturingNotes: [],
    isLoading: false,
    error: null,
  }),
}))
