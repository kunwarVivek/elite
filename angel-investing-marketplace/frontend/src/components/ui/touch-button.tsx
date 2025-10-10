import React from 'react'
import { Button, ButtonProps } from '@/components/ui/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const touchButtonVariants = cva(
  "touch-manipulation select-none active:scale-95 transition-transform",
  {
    variants: {
      size: {
        sm: "h-10 min-w-10 px-3 text-sm", // Minimum 40px height for touch
        default: "h-12 min-w-12 px-4 text-base", // 48px height for better touch
        lg: "h-14 min-w-14 px-6 text-lg", // 56px height for prominent actions
        xl: "h-16 min-w-16 px-8 text-xl", // 64px height for hero actions
        icon: "h-12 w-12 min-w-12", // Square icon buttons
        "icon-sm": "h-10 w-10 min-w-10",
        "icon-lg": "h-14 w-14 min-w-14",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface TouchButtonProps
  extends ButtonProps,
    VariantProps<typeof touchButtonVariants> {
  haptic?: boolean
  longPressDelay?: number
  onLongPress?: () => void
}

const TouchButton = React.forwardRef<HTMLButtonElement, TouchButtonProps>(
  ({
    className,
    variant,
    size,
    haptic = false,
    longPressDelay = 500,
    onLongPress,
    children,
    onTouchStart,
    onTouchEnd,
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    ...props
  }, ref) => {
    const longPressTimerRef = React.useRef<NodeJS.Timeout>()
    const [isPressed, setIsPressed] = React.useState(false)

    const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
      setIsPressed(true)

      // Start long press timer
      if (onLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          onLongPress()
          if (haptic && 'vibrate' in navigator) {
            navigator.vibrate(50)
          }
        }, longPressDelay)
      }

      onTouchStart?.(e)
    }

    const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
      setIsPressed(false)

      // Clear long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }

      // Haptic feedback for normal press
      if (haptic && 'vibrate' in navigator) {
        navigator.vibrate(25)
      }

      onTouchEnd?.(e)
    }

    const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsPressed(true)
      onMouseDown?.(e)
    }

    const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsPressed(false)

      // Clear long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }

      onMouseUp?.(e)
    }

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      setIsPressed(false)

      // Clear long press timer
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }

      onMouseLeave?.(e)
    }

    return (
      <Button
        className={cn(
          touchButtonVariants({ size }),
          isPressed && "scale-95",
          className
        )}
        variant={variant}
        ref={ref}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {children}
      </Button>
    )
  }
)

TouchButton.displayName = "TouchButton"

export { TouchButton, touchButtonVariants }