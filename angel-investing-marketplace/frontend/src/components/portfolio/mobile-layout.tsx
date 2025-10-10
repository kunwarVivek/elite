import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Menu,
  Home,
  TrendingUp,
  PieChart,
  Target,
  Settings,
  Bell,
  User,
  LogOut,
  ChevronRight
} from 'lucide-react'
import { useMobile } from '@/hooks/use-mobile'

interface MobileLayoutProps {
  children: React.ReactNode
  currentPage: string
  onNavigate: (page: string) => void
}

interface NavigationItem {
  id: string
  label: string
  icon: React.ReactNode
  badge?: string
}

function MobileNavigationDrawer({
  isOpen,
  onClose,
  currentPage,
  onNavigate
}: {
  isOpen: boolean
  onClose: () => void
  currentPage: string
  onNavigate: (page: string) => void
}) {
  const navigationItems: NavigationItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="h-5 w-5" /> },
    { id: 'investments', label: 'Investments', icon: <TrendingUp className="h-5 w-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <PieChart className="h-5 w-5" /> },
    { id: 'goals', label: 'Goals', icon: <Target className="h-5 w-5" /> },
    { id: 'alerts', label: 'Alerts', icon: <Bell className="h-5 w-5" />, badge: '3' },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
  ]

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle>Portfolio Menu</SheetTitle>
          <SheetDescription>
            Navigate through your investment portfolio
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-2">
          {navigationItems.map((item) => (
            <Button
              key={item.id}
              variant={currentPage === item.id ? 'default' : 'ghost'}
              className="w-full justify-start h-12"
              onClick={() => {
                onNavigate(item.id)
                onClose()
              }}
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <Badge className="ml-auto" variant="destructive">
                    {item.badge}
                  </Badge>
                )}
              </div>
              {currentPage === item.id && (
                <ChevronRight className="h-4 w-4 ml-auto" />
              )}
            </Button>
          ))}

          <div className="pt-4 border-t mt-6">
            <Button variant="ghost" className="w-full justify-start h-12">
              <User className="h-5 w-5 mr-3" />
              <span>Profile</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start h-12">
              <LogOut className="h-5 w-5 mr-3" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function MobileTabNavigation({
  currentPage,
  onNavigate
}: {
  currentPage: string
  onNavigate: (page: string) => void
}) {
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: <Home className="h-4 w-4" /> },
    { id: 'investments', label: 'Investments', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <PieChart className="h-4 w-4" /> },
    { id: 'goals', label: 'Goals', icon: <Target className="h-4 w-4" /> },
  ]

  return (
    <div className="sticky top-0 z-50 bg-background border-b">
      <Tabs value={currentPage} onValueChange={onNavigate} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-14">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex flex-col gap-1 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {tab.icon}
              <span className="text-xs">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  )
}

function MobileOptimizedCard({ children, title, description }: {
  children: React.ReactNode
  title?: string
  description?: string
}) {
  return (
    <Card className="mx-2">
      {(title || description) && (
        <CardHeader className="pb-3">
          {title && <CardTitle className="text-lg">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="px-4 pb-4">
        {children}
      </CardContent>
    </Card>
  )
}

function MobileChartContainer({ children, height = 300 }: {
  children: React.ReactNode
  height?: number
}) {
  return (
    <div className="w-full overflow-x-auto">
      <div style={{ height: `${height}px`, minWidth: '400px' }}>
        {children}
      </div>
    </div>
  )
}

function MobileTableContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      {children}
    </div>
  )
}

function MobileGridContainer({
  children,
  columns = 2
}: {
  children: React.ReactNode
  columns?: number
}) {
  return (
    <div className={`grid gap-3 grid-cols-${columns} sm:grid-cols-${Math.min(columns + 1, 4)}`}>
      {children}
    </div>
  )
}

function MobileActionButton({
  children,
  onClick,
  variant = 'default',
  size = 'default',
  fullWidth = false
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  fullWidth?: boolean
}) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      className={fullWidth ? 'w-full' : ''}
    >
      {children}
    </Button>
  )
}

function MobileFilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-2">
      <div className="flex gap-2 min-w-max">
        {children}
      </div>
    </div>
  )
}

function MobileStatsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 px-2">
      {children}
    </div>
  )
}

function MobileSectionHeader({
  title,
  action,
  children
}: {
  title: string
  action?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-2 py-3">
      <div>
        <h3 className="font-medium">{title}</h3>
        {children}
      </div>
      {action}
    </div>
  )
}

export function MobileLayout({ children, currentPage, onNavigate }: MobileLayoutProps) {
  const isMobile = useMobile()
  const [showDrawer, setShowDrawer] = useState(false)

  if (!isMobile) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <Sheet open={showDrawer} onOpenChange={setShowDrawer}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <MobileNavigationDrawer
              isOpen={showDrawer}
              onClose={() => setShowDrawer(false)}
              currentPage={currentPage}
              onNavigate={onNavigate}
            />
          </Sheet>

          <h1 className="font-semibold">Portfolio</h1>

          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
        </div>

        <MobileTabNavigation currentPage={currentPage} onNavigate={onNavigate} />
      </div>

      {/* Mobile Content */}
      <div className="pb-20">
        {children}
      </div>

      {/* Mobile Bottom Spacing */}
      <div className="h-4" />
    </div>
  )
}

// Export mobile-optimized components for use in other components
export {
  MobileOptimizedCard,
  MobileChartContainer,
  MobileTableContainer,
  MobileGridContainer,
  MobileActionButton,
  MobileFilterBar,
  MobileStatsGrid,
  MobileSectionHeader
}