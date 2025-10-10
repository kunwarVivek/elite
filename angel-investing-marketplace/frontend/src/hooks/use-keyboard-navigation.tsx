import { useEffect, useCallback } from 'react'

interface KeyboardNavigationOptions {
  onEscape?: () => void
  onEnter?: () => void
  onArrowUp?: () => void
  onArrowDown?: () => void
  onArrowLeft?: () => void
  onArrowRight?: () => void
  onTab?: () => void
  onSpace?: () => void
  enabled?: boolean
}

export function useKeyboardNavigation({
  onEscape,
  onEnter,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  onTab,
  onSpace,
  enabled = true,
}: KeyboardNavigationOptions = {}) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    switch (event.key) {
      case 'Escape':
        onEscape?.()
        break
      case 'Enter':
        onEnter?.()
        break
      case 'ArrowUp':
        event.preventDefault()
        onArrowUp?.()
        break
      case 'ArrowDown':
        event.preventDefault()
        onArrowDown?.()
        break
      case 'ArrowLeft':
        event.preventDefault()
        onArrowLeft?.()
        break
      case 'ArrowRight':
        event.preventDefault()
        onArrowRight?.()
        break
      case 'Tab':
        onTab?.()
        break
      case ' ':
        event.preventDefault()
        onSpace?.()
        break
    }
  }, [
    enabled,
    onEscape,
    onEnter,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onTab,
    onSpace,
  ])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Focus management utilities
export function useFocusTrap(isActive: boolean = true) {
  useEffect(() => {
    if (!isActive) return

    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus()
          e.preventDefault()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)
    firstElement?.focus()

    return () => {
      document.removeEventListener('keydown', handleTabKey)
    }
  }, [isActive])
}

// Skip link for keyboard users
export function SkipLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className={`
        sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
        bg-primary text-primary-foreground px-4 py-2 rounded-md z-50
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
      `}
    >
      {children}
    </a>
  )
}

// Keyboard shortcuts help
export function KeyboardShortcutsHelp({
  shortcuts
}: {
  shortcuts: Array<{ key: string; description: string }>
}) {
  return (
    <div className="space-y-2">
      <h4 className="font-medium text-sm">Keyboard Shortcuts</h4>
      <div className="space-y-1">
        {shortcuts.map((shortcut) => (
          <div key={shortcut.key} className="flex justify-between text-sm">
            <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">
              {shortcut.key}
            </kbd>
            <span className="text-muted-foreground">{shortcut.description}</span>
          </div>
        ))}
      </div>
    </div>
  )
}