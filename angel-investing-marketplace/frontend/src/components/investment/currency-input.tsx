import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string
  value: number | string
  onChange: (value: number) => void
  currency?: string
  error?: string
  helperText?: string
}

export function CurrencyInput({
  label,
  value,
  onChange,
  currency = 'USD',
  error,
  helperText,
  className,
  disabled,
  ...props
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = React.useState('')

  React.useEffect(() => {
    if (value !== undefined && value !== null) {
      const numValue = typeof value === 'string' ? parseFloat(value) : value
      setDisplayValue(formatCurrency(numValue))
    }
  }, [value])

  const formatCurrency = (num: number): string => {
    if (isNaN(num)) return ''
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num)
  }

  const parseCurrency = (str: string): number => {
    const cleaned = str.replace(/[^0-9.-]/g, '')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    const numericValue = parseCurrency(rawValue)
    setDisplayValue(rawValue)
    onChange(numericValue)
  }

  const handleBlur = () => {
    const numericValue = parseCurrency(displayValue)
    setDisplayValue(formatCurrency(numericValue))
    onChange(numericValue)
  }

  const currencySymbol = currency === 'USD' ? '$' : currency

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={props.id}>{label}</Label>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {currencySymbol}
        </span>
        <Input
          {...props}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          className={cn('pl-8', error && 'border-destructive', className)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {helperText && !error && <p className="text-sm text-muted-foreground">{helperText}</p>}
    </div>
  )
}
