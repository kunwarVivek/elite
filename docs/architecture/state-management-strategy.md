# State Management Strategy with Zustand

## Overview

The angel investing platform uses Zustand for global state management, providing a lightweight, scalable solution for managing application state across components, with integration to React Query for server state and real-time updates.

## State Management Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        REACT COMPONENTS                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  UI          │  │  React      │  │  Event      │              │
│  │  Components  │  │  Query      │  │  Handlers   │              │
│  │             │  │  Cache      │  │             │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────┬───────────────────────────────────────────────┘
                  │ State Updates
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ZUSTAND STORES                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Auth       │  │  UI State   │  │  Real-time  │              │
│  │  Store      │  │  Store      │  │  Store      │              │
│  │             │  │             │  │             │              │
│  │  • User     │  │  • Modals   │  │  • Messages │              │
│  │  • Session  │  │  • Loading  │  │  • Notifs   │              │
│  │  • Profile  │  │  • Forms    │  │  • Live Data│              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────┬───────────────────────────────────────────────┘
                  │ Persistence Layer
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     LOCAL STORAGE                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  User       │  │  Preferences│  │  UI State   │              │
│  │  Session    │  │             │  │  Cache      │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## Store Organization

### Core Store Structure

```typescript
// stores/index.ts
export { useAuthStore } from './auth-store'
export { useUIStore } from './ui-store'
export { useInvestmentStore } from './investment-store'
export { useStartupStore } from './startup-store'
export { useMessageStore } from './message-store'
export { useNotificationStore } from './notification-store'
export { usePortfolioStore } from './portfolio-store'
export { useSearchStore } from './search-store'

// Re-export commonly used combinations
export const useAppStores = () => ({
  auth: useAuthStore(),
  ui: useUIStore(),
  notifications: useNotificationStore(),
  messages: useMessageStore()
})
```

## Individual Store Implementations

### Authentication Store

```typescript
// stores/auth-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  role: 'FOUNDER' | 'INVESTOR' | 'SYNDICATE_LEAD' | 'ADMIN'
  avatar_url?: string
  is_verified: boolean
  created_at: string
}

interface AuthState {
  // State
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  lastActivity: number

  // Actions
  login: (user: User, accessToken: string, refreshToken: string) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  refreshToken: () => Promise<void>
  setLoading: (loading: boolean) => void
  updateLastActivity: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,
      lastActivity: Date.now(),

      // Actions
      login: (user, accessToken, refreshToken) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
          lastActivity: Date.now()
        })

        // Setup token refresh timer
        setupTokenRefreshTimer(refreshToken)
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false
        })

        // Clear token refresh timer
        clearTokenRefreshTimer()
      },

      updateUser: (updates) => {
        const { user } = get()
        if (user) {
          set({
            user: { ...user, ...updates },
            lastActivity: Date.now()
          })
        }
      },

      refreshToken: async () => {
        const { refreshToken } = get()
        if (!refreshToken) return

        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          })

          if (response.ok) {
            const { accessToken, refreshToken: newRefreshToken } = await response.json()
            set({ accessToken, refreshToken: newRefreshToken })
          } else {
            get().logout()
          }
        } catch (error) {
          console.error('Token refresh failed:', error)
          get().logout()
        }
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },

      updateLastActivity: () => {
        set({ lastActivity: Date.now() })
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity
      })
    }
  )
)

// Token refresh management
let refreshTimer: NodeJS.Timeout

function setupTokenRefreshTimer(refreshToken: string) {
  clearTokenRefreshTimer()

  // Refresh token 5 minutes before expiry
  refreshTimer = setTimeout(async () => {
    const { refreshToken: currentToken } = useAuthStore.getState()
    if (currentToken === refreshToken) {
      await useAuthStore.getState().refreshToken()
    }
  }, 55 * 60 * 1000) // 55 minutes
}

function clearTokenRefreshTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
  }
}
```

### UI State Store

```typescript
// stores/ui-store.ts
import { create } from 'zustand'

interface ModalState {
  isOpen: boolean
  type: string | null
  data?: any
}

interface UIState {
  // Modals
  modals: Record<string, ModalState>

  // Loading states
  loading: Record<string, boolean>

  // Sidebar
  sidebarOpen: boolean

  // Theme
  theme: 'light' | 'dark' | 'system'

  // Layout
  layout: 'default' | 'compact' | 'expanded'

  // Actions
  openModal: (type: string, data?: any) => void
  closeModal: (type?: string) => void
  closeAllModals: () => void
  setLoading: (key: string, loading: boolean) => void
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setLayout: (layout: 'default' | 'compact' | 'expanded') => void
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  modals: {},
  loading: {},
  sidebarOpen: false,
  theme: 'system',
  layout: 'default',

  // Actions
  openModal: (type, data) => {
    set({
      modals: {
        ...get().modals,
        [type]: { isOpen: true, type, data }
      }
    })
  },

  closeModal: (type) => {
    if (type) {
      set({
        modals: {
          ...get().modals,
          [type]: { isOpen: false, type: null, data: undefined }
        }
      })
    } else {
      // Close all modals if no type specified
      const { modals } = get()
      const closedModals: Record<string, ModalState> = {}

      Object.keys(modals).forEach(key => {
        closedModals[key] = { isOpen: false, type: null, data: undefined }
      })

      set({ modals: closedModals })
    }
  },

  closeAllModals: () => {
    get().closeModal()
  },

  setLoading: (key, loading) => {
    set({
      loading: {
        ...get().loading,
        [key]: loading
      }
    })
  },

  toggleSidebar: () => {
    set({ sidebarOpen: !get().sidebarOpen })
  },

  setTheme: (theme) => {
    set({ theme })

    // Apply theme to document
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  },

  setLayout: (layout) => {
    set({ layout })
  }
}))
```

### Investment Store

```typescript
// stores/investment-store.ts
import { create } from 'zustand'

interface Investment {
  id: string
  investor_id: string
  pitch_id: string
  amount: number
  status: 'PENDING' | 'ESCROW' | 'COMPLETED' | 'CANCELLED'
  created_at: string
  pitch?: {
    id: string
    title: string
    startup: { name: string }
  }
}

interface InvestmentState {
  // State
  investments: Investment[]
  selectedInvestment: Investment | null
  filters: {
    status?: string
    pitch_id?: string
    date_range?: { start: string; end: string }
  }
  pagination: {
    page: number
    limit: number
    total: number
  }
  isLoading: boolean

  // Actions
  setInvestments: (investments: Investment[]) => void
  addInvestment: (investment: Investment) => void
  updateInvestment: (id: string, updates: Partial<Investment>) => void
  removeInvestment: (id: string) => void
  setSelectedInvestment: (investment: Investment | null) => void
  setFilters: (filters: Partial<InvestmentState['filters']>) => void
  setPagination: (pagination: Partial<InvestmentState['pagination']>) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useInvestmentStore = create<InvestmentState>((set, get) => ({
  // Initial state
  investments: [],
  selectedInvestment: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0
  },
  isLoading: false,

  // Actions
  setInvestments: (investments) => {
    set({ investments })
  },

  addInvestment: (investment) => {
    set({
      investments: [investment, ...get().investments]
    })
  },

  updateInvestment: (id, updates) => {
    set({
      investments: get().investments.map(inv =>
        inv.id === id ? { ...inv, ...updates } : inv
      ),
      selectedInvestment: get().selectedInvestment?.id === id
        ? { ...get().selectedInvestment, ...updates }
        : get().selectedInvestment
    })
  },

  removeInvestment: (id) => {
    set({
      investments: get().investments.filter(inv => inv.id !== id),
      selectedInvestment: get().selectedInvestment?.id === id ? null : get().selectedInvestment
    })
  },

  setSelectedInvestment: (investment) => {
    set({ selectedInvestment: investment })
  },

  setFilters: (filters) => {
    set({
      filters: { ...get().filters, ...filters },
      pagination: { ...get().pagination, page: 1 } // Reset to first page
    })
  },

  setPagination: (pagination) => {
    set({
      pagination: { ...get().pagination, ...pagination }
    })
  },

  setLoading: (loading) => {
    set({ isLoading: loading })
  },

  reset: () => {
    set({
      investments: [],
      selectedInvestment: null,
      filters: {},
      pagination: { page: 1, limit: 20, total: 0 },
      isLoading: false
    })
  }
}))
```

## Advanced State Patterns

### Optimistic Updates

```typescript
// stores/optimistic-store.ts
import { create } from 'zustand'

interface OptimisticState {
  pendingOperations: Map<string, { type: string; data: any; timestamp: number }>

  // Actions
  addOptimisticUpdate: (id: string, type: string, data: any) => void
  removeOptimisticUpdate: (id: string) => void
  rollbackOptimisticUpdate: (id: string) => void
  cleanupStaleOperations: () => void
}

export const useOptimisticStore = create<OptimisticState>((set, get) => ({
  pendingOperations: new Map(),

  addOptimisticUpdate: (id, type, data) => {
    set({
      pendingOperations: new Map(get().pendingOperations).set(id, {
        type,
        data,
        timestamp: Date.now()
      })
    })
  },

  removeOptimisticUpdate: (id) => {
    const newOperations = new Map(get().pendingOperations)
    newOperations.delete(id)
    set({ pendingOperations: newOperations })
  },

  rollbackOptimisticUpdate: (id) => {
    const operation = get().pendingOperations.get(id)
    if (operation) {
      // Rollback logic based on operation type
      switch (operation.type) {
        case 'CREATE_INVESTMENT':
          // Remove the optimistically added investment
          useInvestmentStore.getState().removeInvestment(operation.data.id)
          break
        case 'UPDATE_PITCH':
          // Revert pitch changes
          useStartupStore.getState().updatePitch(operation.data.pitchId, operation.data.previousData)
          break
      }
    }
    get().removeOptimisticUpdate(id)
  },

  cleanupStaleOperations: () => {
    const now = Date.now()
    const staleThreshold = 30000 // 30 seconds

    const newOperations = new Map(get().pendingOperations)
    for (const [id, operation] of newOperations) {
      if (now - operation.timestamp > staleThreshold) {
        get().rollbackOptimisticUpdate(id)
      }
    }
  }
}))

// Usage in components
export const useOptimisticInvestment = () => {
  const addInvestment = useInvestmentStore(state => state.addInvestment)
  const addOptimisticUpdate = useOptimisticStore(state => state.addOptimisticUpdate)
  const removeOptimisticUpdate = useOptimisticStore(state => state.removeOptimisticUpdate)

  const createInvestmentOptimistically = async (investmentData: any) => {
    const tempId = `temp_${Date.now()}`

    // Add optimistic update
    addOptimisticUpdate(tempId, 'CREATE_INVESTMENT', investmentData)

    // Add to store immediately
    addInvestment({ ...investmentData, id: tempId, status: 'PENDING' })

    try {
      // Make API call
      const response = await fetch('/api/investments', {
        method: 'POST',
        body: JSON.stringify(investmentData)
      })

      if (response.ok) {
        const realInvestment = await response.json()
        // Update with real data
        useInvestmentStore.getState().updateInvestment(tempId, realInvestment)
        removeOptimisticUpdate(tempId)
      } else {
        throw new Error('API call failed')
      }
    } catch (error) {
      // Rollback optimistic update
      useOptimisticStore.getState().rollbackOptimisticUpdate(tempId)
    }
  }

  return { createInvestmentOptimistically }
}
```

### Real-time State Synchronization

```typescript
// stores/realtime-store.ts
import { create } from 'zustand'

interface RealTimeState {
  // Connection state
  isConnected: boolean
  connectionId: string | null

  // Subscriptions
  subscriptions: Set<string>

  // Real-time data
  liveUpdates: Record<string, any>

  // Actions
  setConnected: (connected: boolean, connectionId?: string) => void
  subscribe: (channel: string) => void
  unsubscribe: (channel: string) => void
  updateLiveData: (channel: string, data: any) => void
  reset: () => void
}

export const useRealTimeStore = create<RealTimeState>((set, get) => ({
  // Initial state
  isConnected: false,
  connectionId: null,
  subscriptions: new Set(),
  liveUpdates: {},

  // Actions
  setConnected: (connected, connectionId) => {
    set({ isConnected: connected, connectionId })
  },

  subscribe: (channel) => {
    const { subscriptions } = get()
    subscriptions.add(channel)
    set({ subscriptions: new Set(subscriptions) })

    // Send subscription to server
    if (get().isConnected) {
      window.socket?.emit('subscribe', { channel })
    }
  },

  unsubscribe: (channel) => {
    const { subscriptions } = get()
    subscriptions.delete(channel)
    set({ subscriptions: new Set(subscriptions) })

    // Send unsubscription to server
    if (get().isConnected) {
      window.socket?.emit('unsubscribe', { channel })
    }
  },

  updateLiveData: (channel, data) => {
    set({
      liveUpdates: {
        ...get().liveUpdates,
        [channel]: {
          ...get().liveUpdates[channel],
          ...data,
          lastUpdated: Date.now()
        }
      }
    })
  },

  reset: () => {
    set({
      isConnected: false,
      connectionId: null,
      subscriptions: new Set(),
      liveUpdates: {}
    })
  }
}))

// Integration with Socket.IO
export const initializeRealTimeConnection = (token: string) => {
  const socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
    auth: { token }
  })

  socket.on('connect', () => {
    useRealTimeStore.getState().setConnected(true, socket.id)
  })

  socket.on('disconnect', () => {
    useRealTimeStore.getState().setConnected(false, null)
  })

  socket.on('live_update', (data: { channel: string; data: any }) => {
    useRealTimeStore.getState().updateLiveData(data.channel, data.data)
  })

  // Store socket instance globally for access in stores
  window.socket = socket

  return socket
}
```

## State Persistence Strategy

### Selective Persistence

```typescript
// stores/persistence-config.ts
import { PersistOptions } from 'zustand/middleware'

export const authPersistConfig: PersistOptions<any> = {
  name: 'auth-storage',
  partialize: (state) => ({
    user: state.user,
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
    isAuthenticated: state.isAuthenticated,
    lastActivity: state.lastActivity
  }),
  onRehydrateStorage: () => (state) => {
    if (state) {
      // Check if tokens are still valid
      const tokenAge = Date.now() - (state.lastActivity || 0)
      const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days

      if (tokenAge > maxAge) {
        state.logout()
      }
    }
  }
}

export const uiPersistConfig: PersistOptions<any> = {
  name: 'ui-storage',
  partialize: (state) => ({
    theme: state.theme,
    layout: state.layout,
    sidebarOpen: state.sidebarOpen
  })
}
```

### Cross-tab Synchronization

```typescript
// lib/storage-sync.ts
import { BroadcastChannel } from 'broadcast-channel'

export class StorageSync {
  private channel: BroadcastChannel

  constructor() {
    this.channel = new BroadcastChannel('zustand-storage-sync')
    this.setupListeners()
  }

  private setupListeners() {
    this.channel.addEventListener('message', (message) => {
      if (message.type === 'STORAGE_UPDATE') {
        // Handle storage update from another tab
        this.handleStorageUpdate(message.key, message.value)
      }
    })
  }

  broadcastUpdate(key: string, value: any) {
    this.channel.postMessage({
      type: 'STORAGE_UPDATE',
      key,
      value
    })
  }

  private handleStorageUpdate(key: string, value: any) {
    // Update local storage
    localStorage.setItem(key, JSON.stringify(value))

    // Notify zustand stores to rehydrate
    window.dispatchEvent(new StorageEvent('storage', {
      key,
      newValue: JSON.stringify(value)
    }))
  }
}

export const storageSync = new StorageSync()
```

## Integration with React Query

### Query State Management

```typescript
// stores/query-store.ts
import { create } from 'zustand'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface QueryState {
  // Query cache management
  queryCache: Map<string, { data: any; timestamp: number; status: string }>

  // Query state
  queries: Record<string, {
    status: 'idle' | 'loading' | 'success' | 'error'
    data?: any
    error?: any
    lastUpdated?: number
  }>

  // Actions
  setQueryState: (queryKey: string, state: any) => void
  invalidateQuery: (queryKey: string) => void
  updateQueryData: (queryKey: string, updater: (data: any) => any) => void
  clearQueryCache: () => void
}

export const useQueryStore = create<QueryState>((set, get) => ({
  queryCache: new Map(),
  queries: {},

  setQueryState: (queryKey, state) => {
    set({
      queries: {
        ...get().queries,
        [queryKey]: {
          ...get().queries[queryKey],
          ...state,
          lastUpdated: Date.now()
        }
      }
    })
  },

  invalidateQuery: (queryKey) => {
    const { queries } = get()
    if (queries[queryKey]) {
      set({
        queries: {
          ...queries,
          [queryKey]: {
            ...queries[queryKey],
            status: 'idle' as const
          }
        }
      })
    }
  },

  updateQueryData: (queryKey, updater) => {
    const { queries } = get()
    const currentQuery = queries[queryKey]

    if (currentQuery?.data) {
      set({
        queries: {
          ...queries,
          [queryKey]: {
            ...currentQuery,
            data: updater(currentQuery.data),
            lastUpdated: Date.now()
          }
        }
      })
    }
  },

  clearQueryCache: () => {
    set({ queryCache: new Map(), queries: {} })
  }
}))

// Custom hook combining Zustand and React Query
export const useSynchronizedQuery = (queryKey: string[], queryFn: any, options: any = {}) => {
  const queryClient = useQueryClient()
  const setQueryState = useQueryStore(state => state.setQueryState)

  const query = useQuery({
    queryKey,
    queryFn,
    ...options,
    onSuccess: (data) => {
      setQueryState(queryKey.join('-'), {
        status: 'success',
        data,
        lastUpdated: Date.now()
      })
      options.onSuccess?.(data)
    },
    onError: (error) => {
      setQueryState(queryKey.join('-'), {
        status: 'error',
        error,
        lastUpdated: Date.now()
      })
      options.onError?.(error)
    }
  })

  return query
}
```

## Performance Optimization

### Store Splitting Strategy

```typescript
// stores/split-store.ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// Large store split into smaller focused stores
export const useUserStore = create(
  subscribeWithSelector((set) => ({
    // User-specific state only
    profile: null,
    preferences: {},
    setProfile: (profile) => set({ profile }),
    updatePreferences: (preferences) => set({ preferences })
  }))
)

export const useSessionStore = create(
  subscribeWithSelector((set) => ({
    // Session-specific state only
    isAuthenticated: false,
    lastActivity: null,
    login: (user) => set({ isAuthenticated: true, lastActivity: Date.now() }),
    logout: () => set({ isAuthenticated: false, lastActivity: null })
  }))
)

// Combined store for convenience
export const useAuthStore = () => ({
  ...useUserStore(),
  ...useSessionStore()
})
```

### Memory Management

```typescript
// stores/memory-management.ts
export class StoreMemoryManager {
  private static cleanupTimers: Map<string, NodeJS.Timeout> = new Map()

  static setupAutoCleanup(storeName: string, cleanupFn: () => void, intervalMinutes: number = 30) {
    const timer = setInterval(() => {
      cleanupFn()
    }, intervalMinutes * 60 * 1000)

    this.cleanupTimers.set(storeName, timer)
  }

  static cleanupStore(storeName: string) {
    const timer = this.cleanupTimers.get(storeName)
    if (timer) {
      clearInterval(timer)
      this.cleanupTimers.delete(storeName)
    }
  }

  static cleanupAll() {
    this.cleanupTimers.forEach((timer) => clearInterval(timer))
    this.cleanupTimers.clear()
  }
}

// Usage in stores
export const useInvestmentStore = create((set, get) => ({
  investments: [],
  // ... other state

  // Setup cleanup on store creation
  setupCleanup: () => {
    StoreMemoryManager.setupAutoCleanup('investments', () => {
      // Cleanup old investments not accessed recently
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
      const recentInvestments = get().investments.filter(inv =>
        new Date(inv.created_at).getTime() > thirtyDaysAgo
      )
      set({ investments: recentInvestments })
    })
  }
}))
```

## Error Handling and Loading States

### Global Error Store

```typescript
// stores/error-store.ts
import { create } from 'zustand'

interface AppError {
  id: string
  message: string
  code?: string
  timestamp: number
  context?: Record<string, any>
}

interface ErrorState {
  errors: AppError[]
  globalError: AppError | null

  // Actions
  addError: (error: Omit<AppError, 'id' | 'timestamp'>) => void
  removeError: (id: string) => void
  clearErrors: () => void
  setGlobalError: (error: AppError | null) => void
}

export const useErrorStore = create<ErrorState>((set, get) => ({
  errors: [],
  globalError: null,

  addError: (error) => {
    const fullError: AppError = {
      ...error,
      id: `error_${Date.now()}_${Math.random()}`,
      timestamp: Date.now()
    }

    set({
      errors: [...get().errors, fullError]
    })

    // Auto-remove after 10 seconds
    setTimeout(() => {
      get().removeError(fullError.id)
    }, 10000)
  },

  removeError: (id) => {
    set({
      errors: get().errors.filter(error => error.id !== id)
    })
  },

  clearErrors: () => {
    set({ errors: [], globalError: null })
  },

  setGlobalError: (error) => {
    set({ globalError: error })
  }
}))
```

### Loading State Management

```typescript
// stores/loading-store.ts
import { create } from 'zustand'

interface LoadingState {
  loadingStates: Record<string, boolean>
  globalLoading: boolean

  // Actions
  setLoading: (key: string, loading: boolean) => void
  setGlobalLoading: (loading: boolean) => void
  isLoading: (key?: string) => boolean
}

export const useLoadingStore = create<LoadingState>((set, get) => ({
  loadingStates: {},
  globalLoading: false,

  setLoading: (key, loading) => {
    set({
      loadingStates: {
        ...get().loadingStates,
        [key]: loading
      }
    })
  },

  setGlobalLoading: (loading) => {
    set({ globalLoading: loading })
  },

  isLoading: (key) => {
    if (key) {
      return get().loadingStates[key] || false
    }
    return get().globalLoading || Object.values(get().loadingStates).some(Boolean)
  }
}))
```

## Zustand DevTools Integration

### Development Helpers

```typescript
// stores/dev-tools.ts
import { devtools } from 'zustand/middleware'

export const withDevTools = (storeName: string) =>
  devtools(
    (set, get) => ({
      // Store implementation
    }),
    {
      name: storeName,
      enabled: process.env.NODE_ENV === 'development'
    }
  )

// Enhanced store with debugging
export const useDebugStore = create(
  devtools(
    (set, get) => ({
      state: {},
      actions: {},

      // Action wrapper with logging
      dispatch: (actionType: string, payload?: any) => {
        console.log(`[Store] ${actionType}`, payload)
        set({ lastAction: { type: actionType, payload, timestamp: Date.now() } })
      }
    }),
    { name: 'debug-store' }
  )
)
```

This state management strategy provides a comprehensive, scalable foundation for managing application state in the angel investing platform, with proper separation of concerns, performance optimization, and development tools.