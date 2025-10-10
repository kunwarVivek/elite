import React from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/providers/ThemeProvider'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Dark mode optimized chart colors
export const darkModeChartColors = {
  primary: 'hsl(217, 91%, 60%)',
  secondary: 'hsl(217, 32%, 17%)',
  accent: 'hsl(217, 91%, 60%)',
  background: 'hsl(222, 84%, 5%)',
  foreground: 'hsl(210, 40%, 98%)',
  muted: 'hsl(217, 32%, 17%)',
  card: 'hsl(222, 84%, 5%)',
  border: 'hsl(217, 32%, 17%)',
  grid: 'hsl(217, 32%, 17%)',
  text: 'hsl(210, 40%, 98%)',
  gradients: {
    primary: 'linear-gradient(135deg, hsl(217, 91%, 60%) 0%, hsl(224, 76%, 48%) 100%)',
    success: 'linear-gradient(135deg, hsl(142, 76%, 36%) 0%, hsl(158, 64%, 52%) 100%)',
    warning: 'linear-gradient(135deg, hsl(38, 92%, 50%) 0%, hsl(48, 96%, 89%) 100%)',
    danger: 'linear-gradient(135deg, hsl(0, 84%, 60%) 0%, hsl(0, 72%, 51%) 100%)'
  }
}

// Light mode optimized chart colors
export const lightModeChartColors = {
  primary: 'hsl(222, 84%, 5%)',
  secondary: 'hsl(210, 40%, 96%)',
  accent: 'hsl(210, 40%, 96%)',
  background: 'hsl(0, 0%, 100%)',
  foreground: 'hsl(222, 84%, 5%)',
  muted: 'hsl(210, 40%, 96%)',
  card: 'hsl(0, 0%, 100%)',
  border: 'hsl(214, 32%, 91%)',
  grid: 'hsl(214, 32%, 91%)',
  text: 'hsl(222, 84%, 5%)',
  gradients: {
    primary: 'linear-gradient(135deg, hsl(222, 84%, 5%) 0%, hsl(217, 91%, 60%) 100%)',
    success: 'linear-gradient(135deg, hsl(142, 76%, 36%) 0%, hsl(158, 64%, 52%) 100%)',
    warning: 'linear-gradient(135deg, hsl(38, 92%, 50%) 0%, hsl(48, 96%, 89%) 100%)',
    danger: 'linear-gradient(135deg, hsl(0, 84%, 60%) 0%, hsl(0, 72%, 51%) 100%)'
  }
}

// Get chart colors based on current theme
export function getChartColors(theme: string) {
  return theme === 'dark' ? darkModeChartColors : lightModeChartColors
}

// Dark mode aware chart configuration
export function getChartConfig(theme: string) {
  const colors = getChartColors(theme)

  return {
    backgroundColor: colors.background,
    textColor: colors.text,
    gridColor: colors.grid,
    colors: {
      primary: colors.primary,
      background: colors.background,
      grid: colors.grid,
      text: colors.text,
    }
  }
}