import { create } from 'zustand'

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

interface Modal {
  id: string
  type: string
  props?: Record<string, any>
}

interface UIState {
  // Notifications
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void

  // Modals
  modals: Modal[]
  openModal: (type: string, props?: Record<string, any>) => string
  closeModal: (id: string) => void

  // Loading states
  loadingStates: Record<string, boolean>
  setLoading: (key: string, loading: boolean) => void

  // Sidebar
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void

  // Theme
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}

export const useUIStore = create<UIState>((set, get) => ({
  notifications: [],
  modals: [],
  loadingStates: {},
  sidebarOpen: false,
  theme: 'system',

  addNotification: (notification) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newNotification: Notification = {
      id,
      duration: 5000,
      ...notification,
    }

    set((state) => ({
      notifications: [...state.notifications, newNotification],
    }))

    // Auto remove notification after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        get().removeNotification(id)
      }, newNotification.duration)
    }
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }))
  },

  openModal: (type, props) => {
    const id = Math.random().toString(36).substr(2, 9)
    const modal: Modal = { id, type, props }

    set((state) => ({
      modals: [...state.modals, modal],
    }))

    return id
  },

  closeModal: (id) => {
    set((state) => ({
      modals: state.modals.filter((m) => m.id !== id),
    }))
  },

  setLoading: (key, loading) => {
    set((state) => ({
      loadingStates: {
        ...state.loadingStates,
        [key]: loading,
      },
    }))
  },

  setSidebarOpen: (open) => {
    set({ sidebarOpen: open })
  },

  setTheme: (theme) => {
    set({ theme })

    // Apply theme to document
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  },
}))