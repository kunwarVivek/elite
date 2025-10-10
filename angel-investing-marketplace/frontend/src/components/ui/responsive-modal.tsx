import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface ResponsiveModalProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  description?: string
  trigger?: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen'
  className?: string
  showClose?: boolean
}

export function ResponsiveModal({
  children,
  open,
  onOpenChange,
  title,
  description,
  trigger,
  footer,
  size = 'md',
  className,
  showClose = true,
}: ResponsiveModalProps) {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    fullscreen: 'max-w-full h-full',
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={cn(
          // Base responsive modal styles
          'gap-0 p-0',
          // Size variants
          sizeClasses[size],
          // Mobile-first responsive behavior
          'w-[95vw] max-h-[90vh]',
          'sm:w-full sm:max-h-[85vh]',
          // Fullscreen on mobile for fullscreen variant
          size === 'fullscreen' && 'w-full h-full max-w-full max-h-full m-0 rounded-none',
          className
        )}
      >
        {/* Header */}
        {(title || description || showClose) && (
          <DialogHeader className="p-4 sm:p-6 border-b">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {title && (
                  <DialogTitle className="text-lg sm:text-xl font-semibold text-left">
                    {title}
                  </DialogTitle>
                )}
                {description && (
                  <DialogDescription className="mt-2 text-sm sm:text-base text-left">
                    {description}
                  </DialogDescription>
                )}
              </div>
              {showClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 ml-4"
                  onClick={() => onOpenChange?.(false)}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              )}
            </div>
          </DialogHeader>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className={cn(
              // Responsive padding
              'p-4 sm:p-6',
              // Fullscreen variant adjustments
              size === 'fullscreen' && 'p-0 h-full'
            )}>
              {children}
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        {footer && (
          <div className="border-t p-4 sm:p-6">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Specialized modal variants for common use cases
export function MobileModal({
  children,
  title,
  ...props
}: Omit<ResponsiveModalProps, 'size'>) {
  return (
    <ResponsiveModal
      size="sm"
      className="sm:max-w-md"
      {...props}
    >
      {children}
    </ResponsiveModal>
  )
}

export function TabletModal({
  children,
  title,
  ...props
}: Omit<ResponsiveModalProps, 'size'>) {
  return (
    <ResponsiveModal
      size="md"
      className="sm:max-w-lg"
      {...props}
    >
      {children}
    </ResponsiveModal>
  )
}

export function DesktopModal({
  children,
  title,
  ...props
}: Omit<ResponsiveModalProps, 'size'>) {
  return (
    <ResponsiveModal
      size="lg"
      className="sm:max-w-2xl"
      {...props}
    >
      {children}
    </ResponsiveModal>
  )
}

export function FullscreenModal({
  children,
  title,
  ...props
}: Omit<ResponsiveModalProps, 'size'>) {
  return (
    <ResponsiveModal
      size="fullscreen"
      showClose={true}
      className="w-full h-full max-w-full max-h-full m-0 rounded-none"
      {...props}
    >
      {children}
    </ResponsiveModal>
  )
}

// Modal with responsive form layout
export function FormModal({
  children,
  title,
  description,
  trigger,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  loading,
  ...props
}: ResponsiveModalProps & {
  onSubmit?: () => void
  submitLabel?: string
  cancelLabel?: string
  loading?: boolean
}) {
  return (
    <ResponsiveModal
      title={title}
      description={description}
      trigger={trigger}
      size="md"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => props.onOpenChange?.(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? 'Saving...' : submitLabel}
          </Button>
        </div>
      }
      {...props}
    >
      <div className="space-y-4">
        {children}
      </div>
    </ResponsiveModal>
  )
}