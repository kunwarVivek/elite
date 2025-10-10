import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Bell,
  Search,
  Settings,
  LogOut,
  Plus,
  Menu,
  TrendingUp,
} from 'lucide-react'

interface ResponsiveHeaderProps {
  user?: {
    name: string
    email: string
    avatar?: string
    unreadNotifications?: number
  }
  onLogout?: () => void
  onMobileMenuToggle?: () => void
  showMobileMenu?: boolean
  title?: string
  subtitle?: string
  actions?: React.ReactNode
}

export function ResponsiveHeader({
  user,
  onLogout,
  onMobileMenuToggle,
  showMobileMenu = false,
  title = "Dashboard",
  subtitle,
  actions,
}: ResponsiveHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMobileMenuToggle}
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Logo - Hidden on mobile when sidebar is present */}
        <div className="hidden lg:flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Angel Marketplace</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Page Title - Mobile and Tablet */}
        <div className="flex-1 lg:hidden">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {/* Search Bar - Desktop */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search startups, investors..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Quick Actions */}
          <div className="hidden sm:flex items-center space-x-2">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden md:inline">New Investment</span>
            </Button>
          </div>

          {/* Notifications */}
          {user?.unreadNotifications && user.unreadNotifications > 0 && (
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-4 h-4" />
              <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 text-xs">
                {user.unreadNotifications > 99 ? '99+' : user.unreadNotifications}
              </Badge>
            </Button>
          )}

          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  My Portfolio
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Preferences
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
          )}

          {/* Custom Actions */}
          {actions}
        </div>
      </div>
    </header>
  )
}