interface RuntimeConfig {
  apiUrl: string
  wsUrl: string
  betterAuthUrl: string
}

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: RuntimeConfig
  }
}

export const getRuntimeConfig = (): RuntimeConfig => {
  return window.__RUNTIME_CONFIG__ || {
    apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
    wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:3001',
    betterAuthUrl: import.meta.env.VITE_BETTER_AUTH_URL || 'http://localhost:3001/api/auth'
  }
}
