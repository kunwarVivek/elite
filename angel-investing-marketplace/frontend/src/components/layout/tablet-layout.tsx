import React from 'react'
import { cn } from '@/lib/utils'

interface TabletLayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  header?: React.ReactNode
  className?: string
}

export function TabletLayout({
  children,
  sidebar,
  header,
  className,
}: TabletLayoutProps) {
  return (
    <div className={cn(
      'min-h-screen bg-background',
      // Tablet-specific optimizations
      'md:max-w-4xl md:mx-auto',
      className
    )}>
      {/* Header for tablet */}
      {header && (
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:block hidden">
          {header}
        </header>
      )}

      <div className="flex">
        {/* Sidebar for tablet - collapsible */}
        {sidebar && (
          <aside className="hidden md:block w-64 border-r bg-muted/30">
            <div className="p-4">
              {sidebar}
            </div>
          </aside>
        )}

        {/* Main content area */}
        <main className="flex-1 min-w-0">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

// Two-column layout for tablets
export function TabletSplitLayout({
  left,
  right,
  leftWidth = 'w-1/2',
  rightWidth = 'w-1/2',
  className,
}: {
  left: React.ReactNode
  right: React.ReactNode
  leftWidth?: string
  rightWidth?: string
  className?: string
}) {
  return (
    <div className={cn(
      'hidden md:flex gap-6 h-[calc(100vh-8rem)]',
      className
    )}>
      <div className={cn('flex-shrink-0 overflow-hidden', leftWidth)}>
        <div className="h-full overflow-y-auto">
          {left}
        </div>
      </div>
      <div className={cn('flex-1 min-w-0 overflow-hidden', rightWidth)}>
        <div className="h-full overflow-y-auto">
          {right}
        </div>
      </div>
    </div>
  )
}

// Three-column layout for larger tablets
export function TabletTripleLayout({
  left,
  center,
  right,
  className,
}: {
  left: React.ReactNode
  center: React.ReactNode
  right: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(
      'hidden lg:flex gap-4 h-[calc(100vh-8rem)]',
      className
    )}>
      <div className="w-80 flex-shrink-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {left}
        </div>
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {center}
        </div>
      </div>
      <div className="w-80 flex-shrink-0 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {right}
        </div>
      </div>
    </div>
  )
}

// Tablet-optimized card grid
export function TabletCardGrid({
  children,
  cols = 2,
  className,
}: {
  children: React.ReactNode
  cols?: number
  className?: string
}) {
  return (
    <div className={cn(
      'hidden md:grid lg:hidden gap-4',
      `grid-cols-${cols}`,
      className
    )}>
      {children}
    </div>
  )
}

// Mobile fallback for tablet layouts
export function MobileTabletFallback({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(
      'md:hidden',
      className
    )}>
      {children}
    </div>
  )
}