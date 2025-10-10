import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { useAuth } from '@/providers/AuthProvider'
import { useUIStore } from '@/stores/ui.store'

export const Route = createRootRoute({
  beforeLoad: () => {
    // Initialize UI store theme
    const { theme } = useUIStore.getState()
    if (theme) {
      const root = window.document.documentElement
      root.classList.remove('light', 'dark')

      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        root.classList.add(systemTheme)
      } else {
        root.classList.add(theme)
      }
    }
  },
  component: () => <RootLayout />,
})

function RootLayout() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </div>
  )
}