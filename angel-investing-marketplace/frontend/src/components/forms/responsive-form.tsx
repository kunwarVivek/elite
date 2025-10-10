import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  children: React.ReactNode
  description?: string
  error?: string
  required?: boolean
  className?: string
}

export function FormField({
  label,
  children,
  description,
  error,
  required,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label
        className={cn(
          'text-sm font-medium',
          // Responsive text sizing
          'text-sm sm:text-base',
          error && 'text-destructive'
        )}
      >
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {description && (
        <p className="text-xs sm:text-sm text-muted-foreground">
          {description}
        </p>
      )}

      <div className="mt-1">
        {children}
      </div>

      {error && (
        <p className="text-xs sm:text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

interface ResponsiveInputProps {
  label: string
  type?: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  description?: string
  error?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export function ResponsiveInput({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  description,
  error,
  required,
  disabled,
  className,
}: ResponsiveInputProps) {
  return (
    <FormField
      label={label}
      description={description}
      error={error}
      required={required}
      className={className}
    >
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        className={cn(
          // Responsive height for touch devices
          'h-12 sm:h-10',
          // Responsive padding
          'px-4 py-3 sm:px-3 sm:py-2',
          // Responsive text size
          'text-base sm:text-sm',
          error && 'border-destructive focus-visible:ring-destructive'
        )}
      />
    </FormField>
  )
}

interface ResponsiveTextareaProps {
  label: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  description?: string
  error?: string
  required?: boolean
  disabled?: boolean
  rows?: number
  className?: string
}

export function ResponsiveTextarea({
  label,
  placeholder,
  value,
  onChange,
  description,
  error,
  required,
  disabled,
  rows = 3,
  className,
}: ResponsiveTextareaProps) {
  return (
    <FormField
      label={label}
      description={description}
      error={error}
      required={required}
      className={className}
    >
      <Textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled}
        rows={rows}
        className={cn(
          // Responsive sizing
          'min-h-[120px] sm:min-h-[100px]',
          // Responsive padding
          'px-4 py-3 sm:px-3 sm:py-2',
          // Responsive text size
          'text-base sm:text-sm',
          error && 'border-destructive focus-visible:ring-destructive'
        )}
      />
    </FormField>
  )
}

interface ResponsiveSelectProps {
  label: string
  placeholder?: string
  value?: string
  onValueChange?: (value: string) => void
  description?: string
  error?: string
  required?: boolean
  disabled?: boolean
  options: Array<{ value: string; label: string }>
  className?: string
}

export function ResponsiveSelect({
  label,
  placeholder = 'Select an option',
  value,
  onValueChange,
  description,
  error,
  required,
  disabled,
  options,
  className,
}: ResponsiveSelectProps) {
  return (
    <FormField
      label={label}
      description={description}
      error={error}
      required={required}
      className={className}
    >
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger
          className={cn(
            // Responsive height and touch targets
            'h-12 sm:h-10',
            'px-4 py-3 sm:px-3 sm:py-2',
            'text-base sm:text-sm',
            error && 'border-destructive focus-visible:ring-destructive'
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  )
}

interface ResponsiveCheckboxProps {
  label: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  description?: string
  disabled?: boolean
  className?: string
}

export function ResponsiveCheckbox({
  label,
  checked,
  onCheckedChange,
  description,
  disabled,
  className,
}: ResponsiveCheckboxProps) {
  return (
    <div className={cn('flex items-start space-x-3', className)}>
      <Checkbox
        id={label}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          // Larger touch target for mobile
          'h-6 w-6 sm:h-4 sm:w-4 mt-0.5'
        )}
      />
      <div className="flex-1 space-y-1">
        <Label
          htmlFor={label}
          className={cn(
            'text-sm font-medium cursor-pointer',
            'text-sm sm:text-base',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {label}
        </Label>
        {description && (
          <p className="text-xs sm:text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

// Form layout components
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-6', className)}>
      {(title || description) && (
        <div className="space-y-2">
          {title && (
            <h3 className="text-lg font-medium text-foreground">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="space-y-4 sm:space-y-6">
        {children}
      </div>
    </div>
  )
}

export function FormGrid({
  children,
  cols = { default: 1, sm: 2 },
  gap = 'gap-4 sm:gap-6',
  className,
}: {
  children: React.ReactNode
  cols?: { default?: number; sm?: number }
  gap?: string
  className?: string
}) {
  const getGridCols = () => {
    const classes = ['grid']
    if (cols.default) classes.push(`grid-cols-${cols.default}`)
    if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`)
    return classes.join(' ')
  }

  return (
    <div className={cn(getGridCols(), gap, className)}>
      {children}
    </div>
  )
}