import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ResponsiveCardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  interactive?: boolean
  onClick?: () => void
  href?: string
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function ResponsiveCard({
  children,
  className,
  padding = 'md',
  interactive = false,
  onClick,
  href,
}: ResponsiveCardProps) {
  const CardComponent = href ? 'a' : onClick ? 'button' : 'div'

  const cardProps = href
    ? { href }
    : onClick
    ? {
        onClick,
        className: 'cursor-pointer touch-manipulation active:scale-[0.98] transition-transform',
      }
    : {}

  return (
    <Card
      className={cn(
        // Mobile-first responsive design
        'w-full',
        // Touch-friendly sizing on mobile
        'min-h-[44px]', // Minimum touch target
        // Interactive states
        interactive && 'hover:shadow-md transition-shadow duration-200',
        // Responsive padding
        padding !== 'none' && paddingClasses[padding],
        // Mobile: stack content vertically
        'flex flex-col',
        className
      )}
      asChild
    >
      <CardComponent {...cardProps}>
        {children}
      </CardComponent>
    </Card>
  )
}

// Specialized card variants for different use cases
export function MobileCard({
  children,
  className,
  ...props
}: Omit<ResponsiveCardProps, 'padding'>) {
  return (
    <ResponsiveCard
      padding="sm"
      className={cn(
        'rounded-lg', // Slightly smaller radius on mobile
        'border border-border/50', // Subtle border
        className
      )}
      {...props}
    >
      {children}
    </ResponsiveCard>
  )
}

export function TabletCard({
  children,
  className,
  ...props
}: Omit<ResponsiveCardProps, 'padding'>) {
  return (
    <ResponsiveCard
      padding="md"
      className={cn(
        'rounded-xl', // Medium radius for tablet
        className
      )}
      {...props}
    >
      {children}
    </ResponsiveCard>
  )
}

export function DesktopCard({
  children,
  className,
  ...props
}: Omit<ResponsiveCardProps, 'padding'>) {
  return (
    <ResponsiveCard
      padding="lg"
      className={cn(
        'rounded-xl', // Larger radius for desktop
        'shadow-sm', // More pronounced shadow
        className
      )}
      {...props}
    >
      {children}
    </ResponsiveCard>
  )
}

// Card with responsive content layout
export function AdaptiveCard({
  title,
  description,
  children,
  media,
  actions,
  className,
  ...props
}: ResponsiveCardProps & {
  title?: React.ReactNode
  description?: React.ReactNode
  media?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <ResponsiveCard className={className} {...props}>
      {/* Media section - responsive sizing */}
      {media && (
        <div className="mb-4 -mt-4 -mx-4 sm:-mx-6 lg:-mx-8 mb-4">
          <div className="aspect-video sm:aspect-[4/3] lg:aspect-[3/2]">
            {media}
          </div>
        </div>
      )}

      {/* Content section */}
      <div className="flex-1 space-y-3">
        {title && (
          <CardTitle className="text-lg sm:text-xl line-clamp-2">
            {title}
          </CardTitle>
        )}
        {description && (
          <CardDescription className="text-sm sm:text-base line-clamp-3">
            {description}
          </CardDescription>
        )}
        {children}
      </div>

      {/* Actions section - responsive layout */}
      {actions && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex flex-col sm:flex-row gap-2">
            {actions}
          </div>
        </div>
      )}
    </ResponsiveCard>
  )
}