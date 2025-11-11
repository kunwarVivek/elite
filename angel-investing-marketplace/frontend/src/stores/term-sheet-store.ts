import { create } from 'zustand'
import { termSheetApi, TermSheet } from '@/lib/term-sheet-api'

interface TermSheetStore {
  termSheets: TermSheet[]
  currentTermSheet: TermSheet | null
  isLoading: boolean
  error: string | null

  fetchByRound: (roundId: string) => Promise<void>
  fetchByInvestor: (investorId: string) => Promise<void>
  fetchById: (id: string) => Promise<void>
  create: (data: any) => Promise<TermSheet | null>
  update: (id: string, data: any) => Promise<void>
  propose: (id: string) => Promise<void>
  accept: (id: string) => Promise<void>
  reject: (id: string, reason?: string) => Promise<void>
  createNewVersion: (id: string, changes: any) => Promise<void>
  clearError: () => void
  reset: () => void
}

export const useTermSheetStore = create<TermSheetStore>((set) => ({
  termSheets: [],
  currentTermSheet: null,
  isLoading: false,
  error: null,

  fetchByRound: async (roundId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await termSheetApi.getByRound(roundId)
      set({ termSheets: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchByInvestor: async (investorId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await termSheetApi.getByInvestor(investorId)
      set({ termSheets: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchById: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await termSheetApi.getById(id)
      set({ currentTermSheet: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  create: async (data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await termSheetApi.create(data)
      set((state) => ({
        termSheets: [...state.termSheets, response.data],
        currentTermSheet: response.data,
        isLoading: false,
      }))
      return response.data
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      return null
    }
  },

  update: async (id: string, data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await termSheetApi.update(id, data)
      set((state) => ({
        termSheets: state.termSheets.map((ts) => (ts.id === id ? response.data : ts)),
        currentTermSheet: state.currentTermSheet?.id === id ? response.data : state.currentTermSheet,
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  propose: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await termSheetApi.propose(id)
      set((state) => ({
        termSheets: state.termSheets.map((ts) => (ts.id === id ? response.data : ts)),
        currentTermSheet: state.currentTermSheet?.id === id ? response.data : state.currentTermSheet,
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  accept: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await termSheetApi.accept(id)
      set((state) => ({
        termSheets: state.termSheets.map((ts) => (ts.id === id ? response.data : ts)),
        currentTermSheet: state.currentTermSheet?.id === id ? response.data : state.currentTermSheet,
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  reject: async (id: string, reason?: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await termSheetApi.reject(id, reason)
      set((state) => ({
        termSheets: state.termSheets.map((ts) => (ts.id === id ? response.data : ts)),
        currentTermSheet: state.currentTermSheet?.id === id ? response.data : state.currentTermSheet,
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  createNewVersion: async (id: string, changes: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await termSheetApi.createNewVersion(id, changes)
      set((state) => ({
        termSheets: [...state.termSheets, response.data],
        currentTermSheet: response.data,
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    termSheets: [],
    currentTermSheet: null,
    isLoading: false,
    error: null,
  }),
}))
