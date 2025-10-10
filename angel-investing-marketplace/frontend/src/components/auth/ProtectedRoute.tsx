import { ReactNode } from 'react'
import { useAuth } from '@/providers/AuthProvider'

interface ProtectedRouteProps {
  children: ReactNode
  requireAuth?: boolean
  allowedRoles?: ('investor' | 'founder' | 'admin')[]
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  allowedRoles = []
}: ProtectedRouteProps) {
  const { isAuthenticated, user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (requireAuth && !isAuthenticated) {
    window.location.href = '/auth/login'
    return null
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}