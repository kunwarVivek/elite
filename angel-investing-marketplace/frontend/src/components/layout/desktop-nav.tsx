import React from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Home,
  TrendingUp,
  Users,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  Search,
  Plus,
} from 'lucide-react'

interface DesktopNavProps {
  user?: {
    name: string
    email: string
    avatar?: string
    unreadNotifications?: number
    unreadMessages?: number
  }
  onLogout?: () => void
}

export function DesktopNav({ user, onLogout }: DesktopNavProps) {
  const location = useLocation()

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Startups', href: '/pitches', icon: TrendingUp },
    { name: 'Investors', href: '/investors', icon: Users },
    { name: 'Messages', href: '/messaging', icon: MessageSquare, badge: user?.unreadMessages },
    { name: 'Notifications', href: '/notifications', icon: Bell, badge: user?.unreadNotifications },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard'
    }
    return location.pathname.startsWith(href)
  }

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      {/* Sidebar */}
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-background border-r px-6 py-4">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Angel Marketplace</h1>
              <p className="text-xs text-muted-foreground">Investing Platform</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <Button className="w-full justify-start" size="lg">
            <Plus className="w-4 h-4 mr-2" />
            New Investment
          </Button>
          <Button variant="outline" className="w-full justify-start" size="lg">
            <Search className="w-4 h-4 mr-2" />
            Browse Startups
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)

                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className={`
                          group flex gap-x-3 rounded-lg p-3 text-sm font-medium leading-6 transition-colors
                          ${active
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          }
                        `}
                      >
                        <div className="relative">
                          <Icon className="h-5 w-5 shrink-0" />
                          {item.badge && item.badge > 0 && (
                            <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 text-xs">
                              {item.badge > 99 ? '99+' : item.badge}
                            </Badge>
                          )}
                        </div>
                        {item.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </li>

            <li className="mt-auto">
              <Separator className="mb-4" />
              <ul role="list" className="-mx-2 space-y-1">
                <li>
                  <Link
                    to="/settings"
                    className={`
                      group flex gap-x-3 rounded-lg p-3 text-sm font-medium leading-6 transition-colors
                      ${isActive('/settings')
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }
                    `}
                  >
                    <Settings className="h-5 w-5 shrink-0" />
                    Settings
                  </Link>
                </li>
              </ul>
            </li>
          </ul>
        </nav>
      </div>

      {/* User Profile Section */}
      {user && (
        <div className="border-t bg-background p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start p-2 h-auto">
                <div className="flex items-center space-x-3 w-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer">
                  Profile Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/portfolio" className="cursor-pointer">
                  My Portfolio
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer">
                  Preferences
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={onLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  )
}