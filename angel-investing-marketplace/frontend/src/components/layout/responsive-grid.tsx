import React from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveGridProps {
  children: React.ReactNode
  cols?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: {
    default?: string
    sm?: string
    md?: string
    lg?: string
  }
  className?: string
}

export function ResponsiveGrid({
  children,
  cols = { default: 1, sm: 2, lg: 3, xl: 4 },
  gap = { default: 'gap-4', sm: 'gap-6' },
  className,
}: ResponsiveGridProps) {
  const getGridCols = () => {
    const classes = []

    if (cols.default) classes.push(`grid-cols-${cols.default}`)
    if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`)
    if (cols.md) classes.push(`md:grid-cols-${cols.md}`)
    if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`)
    if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`)

    return classes.join(' ')
  }

  const getGap = () => {
    const classes = []

    if (gap.default) classes.push(gap.default)
    if (gap.sm) classes.push(`sm:${gap.sm}`)
    if (gap.md) classes.push(`md:${gap.md}`)
    if (gap.lg) classes.push(`lg:${gap.lg}`)

    return classes.join(' ')
  }

  return (
    <div
      className={cn(
        'grid',
        getGridCols(),
        getGap(),
        className
      )}
    >
      {children}
    </div>
  )
}

// Predefined responsive grid patterns
export function MobileFirstGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <ResponsiveGrid
      cols={{ default: 1, sm: 2, lg: 3, xl: 4 }}
      gap={{ default: 'gap-4', sm: 'gap-6' }}
      className={className}
    >
      {children}
    </ResponsiveGrid>
  )
}

export function DashboardGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <ResponsiveGrid
      cols={{ default: 1, sm: 2, lg: 4 }}
      gap={{ default: 'gap-4', sm: 'gap-6' }}
      className={className}
    >
      {children}
    </ResponsiveGrid>
  )
}

export function ListGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <ResponsiveGrid
      cols={{ default: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
      gap={{ default: 'gap-3', sm: 'gap-4' }}
      className={className}
    >
      {children}
    </ResponsiveGrid>
  )
}

export function TabletGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <ResponsiveGrid
      cols={{ default: 1, md: 2, lg: 3 }}
      gap={{ default: 'gap-4', md: 'gap-6' }}
      className={className}
    >
      {children}
    </ResponsiveGrid>
  )
}