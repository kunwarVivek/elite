import React, { useState } from 'react'
import { MobileNav } from './mobile-nav'
import { DesktopNav } from './desktop-nav'
import { ResponsiveHeader } from './responsive-header'

interface ResponsiveLayoutProps {
  children: React.ReactNode
  user?: {
    name: string
    email: string
    avatar?: string
    unreadNotifications?: number
    unreadMessages?: number
  }
  onLogout?: () => void
  title?: string
  subtitle?: string
  actions?: React.ReactNode
}

export function ResponsiveLayout({
  children,
  user,
  onLogout,
  title,
  subtitle,
  actions,
}: ResponsiveLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <DesktopNav user={user} onLogout={onLogout} />

      {/* Mobile Navigation */}
      <MobileNav user={user} onLogout={onLogout} />

      {/* Main Content Area */}
      <div className="lg:pl-72">
        {/* Responsive Header */}
        <ResponsiveHeader
          user={user}
          onLogout={onLogout}
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          showMobileMenu={mobileMenuOpen}
          title={title}
          subtitle={subtitle}
          actions={actions}
        />

        {/* Page Content */}
        <main className="py-6">
          <div className="container px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  )
}