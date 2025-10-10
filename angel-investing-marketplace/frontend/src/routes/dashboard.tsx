import { createFileRoute } from '@tanstack/react-router'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/providers/AuthProvider'
import { ResponsiveLayout } from '@/components/layout/responsive-layout'
import { DashboardGrid } from '@/components/layout/responsive-grid'
import { TouchButton } from '@/components/ui/touch-button'
import { ResponsiveCard, AdaptiveCard } from '@/components/ui/responsive-card'
import { TrendingUp, DollarSign, Building2, Target } from 'lucide-react'

export const Route = createFileRoute('/dashboard')({
  component: () => (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  ),
})

function DashboardPage() {
  const { user, logout } = useAuth()

  const stats = [
    {
      title: 'Total Investments',
      value: '$0',
      description: 'No investments yet',
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Portfolio Value',
      value: '$0',
      description: 'Current value',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Active Startups',
      value: '0',
      description: 'In portfolio',
      icon: Building2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Returns',
      value: '0%',
      description: 'Total returns',
      icon: Target,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ]

  return (
    <ResponsiveLayout
      user={user}
      onLogout={logout}
      title="Dashboard"
      subtitle="Welcome to your angel investing dashboard"
    >
      <div className="space-y-6 sm:space-y-8">
        {/* Welcome Section */}
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your angel investing activity
          </p>
        </div>

        {/* Stats Cards */}
        <DashboardGrid>
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <ResponsiveCard key={stat.title} className="text-center">
                <div className="flex flex-col items-center space-y-3">
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </h3>
                    <div className="text-2xl sm:text-3xl font-bold">
                      {stat.value}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  </div>
                </div>
              </ResponsiveCard>
            )
          })}
        </DashboardGrid>

        {/* Quick Actions */}
        <AdaptiveCard
          title="Quick Actions"
          description="Get started with your angel investing journey"
          actions={
            <div className="flex flex-col sm:flex-row gap-3">
              <TouchButton className="flex-1" size="lg">
                Browse Startups
              </TouchButton>
              <TouchButton variant="outline" className="flex-1" size="lg">
                View Investment Opportunities
              </TouchButton>
            </div>
          }
        />

        {/* Recent Activity Placeholder */}
        <AdaptiveCard
          title="Recent Activity"
          description="Your latest investment activities and updates"
        >
          <div className="text-center py-8 text-muted-foreground">
            <p>No recent activity</p>
            <p className="text-sm mt-2">Start investing to see your activity here</p>
          </div>
        </AdaptiveCard>
      </div>
    </ResponsiveLayout>
  )
}