import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface PercentageInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string
  value: number | string
  onChange: (value: number) => void
  error?: string
  helperText?: string
  decimals?: number
}

export function PercentageInput({
  label,
  value,
  onChange,
  error,
  helperText,
  decimals = 2,
  className,
  disabled,
  ...props
}: PercentageInputProps) {
  const [displayValue, setDisplayValue] = React.useState('')

  React.useEffect(() => {
    if (value !== undefined && value !== null) {
      const numValue = typeof value === 'string' ? parseFloat(value) : value
      setDisplayValue(formatPercentage(numValue))
    }
  }, [value])

  const formatPercentage = (num: number): string => {
    if (isNaN(num)) return ''
    return num.toFixed(decimals)
  }

  const parsePercentage = (str: string): number => {
    const cleaned = str.replace(/[^0-9.-]/g, '')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    const numericValue = parsePercentage(rawValue)

    // Validate range 0-100
    if (numericValue < 0) {
      setDisplayValue('0')
      onChange(0)
    } else if (numericValue > 100) {
      setDisplayValue('100')
      onChange(100)
    } else {
      setDisplayValue(rawValue)
      onChange(numericValue)
    }
  }

  const handleBlur = () => {
    const numericValue = parsePercentage(displayValue)
    const clampedValue = Math.max(0, Math.min(100, numericValue))
    setDisplayValue(formatPercentage(clampedValue))
    onChange(clampedValue)
  }

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={props.id}>{label}</Label>}
      <div className="relative">
        <Input
          {...props}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          className={cn('pr-8', error && 'border-destructive', className)}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          %
        </span>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {helperText && !error && <p className="text-sm text-muted-foreground">{helperText}</p>}
    </div>
  )
}
