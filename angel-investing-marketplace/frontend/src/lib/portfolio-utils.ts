// Portfolio utility functions for formatting and calculations

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const targetDate = new Date(date)
  const diffInMs = now.getTime() - targetDate.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInDays === 0) return 'Today'
  if (diffInDays === 1) return 'Yesterday'
  if (diffInDays < 7) return `${diffInDays} days ago`
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`
  return `${Math.floor(diffInDays / 365)} years ago`
}

export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export function calculateIRR(cashFlows: number[], dates: Date[]): number {
  // Simplified IRR calculation - in production, use a proper financial library
  if (cashFlows.length !== dates.length || cashFlows.length < 2) {
    return 0
  }

  // This is a simplified calculation for demonstration
  // In production, use a proper IRR calculation library
  const initialInvestment = Math.abs(cashFlows[0])
  const finalValue = cashFlows[cashFlows.length - 1]

  if (initialInvestment === 0) return 0

  const totalReturn = finalValue - initialInvestment
  const years = (dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24 * 365)

  return years > 0 ? (totalReturn / initialInvestment) / years : 0
}

export function calculateMultiple(invested: number, currentValue: number): number {
  return invested > 0 ? currentValue / invested : 0
}

export function getPerformanceColor(value: number): string {
  if (value > 0) return 'text-green-600'
  if (value < 0) return 'text-red-600'
  return 'text-muted-foreground'
}

export function getPerformanceBgColor(value: number): string {
  if (value > 0) return 'bg-green-50 border-green-200'
  if (value < 0) return 'bg-red-50 border-red-200'
  return 'bg-muted border-muted-foreground/20'
}

export function getRiskColor(score: number): string {
  if (score <= 3) return 'text-green-600'
  if (score <= 6) return 'text-yellow-600'
  return 'text-red-600'
}

export function getStageColor(stage: string): string {
  switch (stage) {
    case 'IDEA': return 'bg-blue-100 text-blue-800'
    case 'PROTOTYPE': return 'bg-purple-100 text-purple-800'
    case 'MVP': return 'bg-green-100 text-green-800'
    case 'GROWTH': return 'bg-orange-100 text-orange-800'
    case 'SCALE': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'COMPLETED': return 'bg-green-100 text-green-800'
    case 'ACTIVE': return 'bg-blue-100 text-blue-800'
    case 'PENDING': return 'bg-yellow-100 text-yellow-800'
    case 'ESCROW': return 'bg-purple-100 text-purple-800'
    case 'CANCELLED': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout

  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function downloadFile(data: Blob, filename: string): void {
  const url = window.URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export function exportToCSV(data: any[], filename: string): void {
  const headers = Object.keys(data[0] || {})
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header]
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  downloadFile(blob, filename)
}

export function exportToJSON(data: any, filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json' })
  downloadFile(blob, filename)
}