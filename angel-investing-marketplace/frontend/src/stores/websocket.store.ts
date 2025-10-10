import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'
import { getRuntimeConfig } from '@/config/runtime'

interface WebSocketState {
  socket: Socket | null
  isConnected: boolean
  connectionError: string | null

  // Connection management
  connect: (token?: string) => void
  disconnect: () => void

  // Event handlers
  onConnect: (callback: () => void) => void
  onDisconnect: (callback: () => void) => void
  onError: (callback: (error: string) => void) => void

  // Real-time data handlers
  onInvestmentUpdate: (callback: (data: any) => void) => void
  onNotification: (callback: (notification: any) => void) => void
  onPriceUpdate: (callback: (data: any) => void) => void

  // Emit events
  joinRoom: (room: string) => void
  leaveRoom: (room: string) => void
  sendMessage: (event: string, data: any) => void
}

export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  connectionError: null,

  connect: (token) => {
    const { socket } = get()
    if (socket?.connected) return

    const config = getRuntimeConfig()
    const newSocket = io(config.wsUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    })

    newSocket.on('connect', () => {
      set({ isConnected: true, connectionError: null })
    })

    newSocket.on('disconnect', () => {
      set({ isConnected: false })
    })

    newSocket.on('connect_error', (error) => {
      set({ connectionError: error.message })
    })

    set({ socket: newSocket })
  },

  disconnect: () => {
    const { socket } = get()
    socket?.disconnect()
    set({ socket: null, isConnected: false, connectionError: null })
  },

  onConnect: (callback) => {
    const { socket } = get()
    socket?.on('connect', callback)
  },

  onDisconnect: (callback) => {
    const { socket } = get()
    socket?.on('disconnect', callback)
  },

  onError: (callback) => {
    const { socket } = get()
    socket?.on('connect_error', (error) => callback(error.message))
  },

  onInvestmentUpdate: (callback) => {
    const { socket } = get()
    socket?.on('investment_update', callback)
  },

  onNotification: (callback) => {
    const { socket } = get()
    socket?.on('notification', callback)
  },

  onPriceUpdate: (callback) => {
    const { socket } = get()
    socket?.on('price_update', callback)
  },

  joinRoom: (room) => {
    const { socket } = get()
    socket?.emit('join_room', room)
  },

  leaveRoom: (room) => {
    const { socket } = get()
    socket?.emit('leave_room', room)
  },

  sendMessage: (event, data) => {
    const { socket } = get()
    socket?.emit(event, data)
  },
}))