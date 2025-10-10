import React, { useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import {
  Menu,
  Home,
  TrendingUp,
  Users,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  X
} from 'lucide-react'

interface MobileNavProps {
  user?: {
    name: string
    avatar?: string
    unreadNotifications?: number
    unreadMessages?: number
  }
  onLogout?: () => void
}

export function MobileNav({ user, onLogout }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Startups', href: '/pitches', icon: TrendingUp },
    { name: 'Investors', href: '/investors', icon: Users },
    { name: 'Messages', href: '/messaging', icon: MessageSquare, badge: user?.unreadMessages },
    { name: 'Notifications', href: '/notifications', icon: Bell, badge: user?.unreadNotifications },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard'
    }
    return location.pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
        <div className="container flex h-14 items-center">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
                aria-label="Toggle navigation menu"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="font-semibold">Angel Marketplace</span>
                  </div>
                </div>

                {/* User Info */}
                {user && (
                  <div className="p-4 border-b">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          Welcome back!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <nav className="flex-1 p-4">
                  <ul className="space-y-2">
                    {navigation.map((item) => {
                      const Icon = item.icon
                      const active = isActive(item.href)

                      return (
                        <li key={item.name}>
                          <Link
                            to={item.href}
                            className={`
                              flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors
                              ${active
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                              }
                            `}
                            onClick={() => setIsOpen(false)}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="flex-1">{item.name}</span>
                            {item.badge && item.badge > 0 && (
                              <Badge variant="secondary" className="ml-auto">
                                {item.badge > 99 ? '99+' : item.badge}
                              </Badge>
                            )}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </nav>

                {/* Footer */}
                <div className="p-4 border-t">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      onLogout?.()
                      setIsOpen(false)
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Angel Marketplace</span>
          </div>

          {/* Right side - User info and notifications */}
          <div className="flex items-center space-x-2 ml-auto">
            {user?.unreadNotifications && user.unreadNotifications > 0 && (
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-4 h-4" />
                <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs">
                  {user.unreadNotifications > 99 ? '99+' : user.unreadNotifications}
                </Badge>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t lg:hidden">
        <div className="grid grid-cols-5 h-16">
          {navigation.slice(0, 5).map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)

            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex flex-col items-center justify-center space-y-1 text-xs transition-colors
                  ${active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.badge && item.badge > 0 && (
                    <Badge className="absolute -top-2 -right-2 w-4 h-4 p-0 text-xs">
                      {item.badge > 99 ? '99+' : item.badge}
                    </Badge>
                  )}
                </div>
                <span className="text-xs">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Add padding bottom to account for fixed bottom nav */}
      <div className="h-16 lg:hidden" />
    </>
  )
}