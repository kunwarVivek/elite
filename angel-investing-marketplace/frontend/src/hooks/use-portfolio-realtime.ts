import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWebSocketStore } from '@/stores/websocket.store'
import { useAuthStore } from '@/stores/auth.store'
import { portfolioKeys } from './use-portfolio'
import { Investment, Portfolio, RecentActivity } from '@/types/portfolio'

interface PortfolioWebSocketEvents {
  // Investment events
  investment_created: { investment: Investment }
  investment_updated: { investment: Investment }
  investment_valuation_updated: { investment_id: string; new_value: number; change_percentage: number }
  investment_exit_completed: { investment_id: string; exit_value: number; exit_type: string }

  // Portfolio events
  portfolio_summary_updated: { portfolio_id: string; summary: any }
  portfolio_performance_updated: { portfolio_id: string; performance_data: any }

  // Activity events
  portfolio_activity_added: { activity: RecentActivity }

  // Alert events
  portfolio_alert_triggered: { alert_type: string; message: string; severity: 'low' | 'medium' | 'high' }

  // Market events
  market_data_updated: { symbol: string; price: number; change: number }
  benchmark_updated: { benchmark: string; value: number; change_percentage: number }
}

export function usePortfolioRealtime(portfolioId?: string) {
  const queryClient = useQueryClient()
  const { socket, isConnected, connect, disconnect } = useWebSocketStore()
  const { token } = useAuthStore()

  // Connect to WebSocket when component mounts
  useEffect(() => {
    if (token && !isConnected) {
      connect(token)
    }

    return () => {
      // Don't disconnect on unmount to keep connection alive for other components
    }
  }, [token, isConnected, connect])

  // Join portfolio room when portfolioId is available
  useEffect(() => {
    if (socket && isConnected && portfolioId) {
      socket.emit('join_portfolio_room', portfolioId)
      socket.emit('subscribe_to_portfolio_updates', { portfolio_id: portfolioId })

      return () => {
        socket.emit('leave_portfolio_room', portfolioId)
        socket.emit('unsubscribe_from_portfolio_updates', { portfolio_id: portfolioId })
      }
    }
  }, [socket, isConnected, portfolioId])

  // Set up event listeners
  useEffect(() => {
    if (!socket || !isConnected) return

    // Investment update handler
    const handleInvestmentUpdate = (data: PortfolioWebSocketEvents['investment_updated']) => {
      const { investment } = data

      // Update investment in cache
      queryClient.setQueryData(
        portfolioKeys.investment(investment.id),
        (oldData: any) => oldData ? { ...oldData, ...investment } : investment
      )

      // Update investment in lists
      queryClient.setQueriesData(
        { queryKey: portfolioKeys.investments() },
        (oldData: any) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            data: oldData.data.map((inv: Investment) =>
              inv.id === investment.id ? { ...inv, ...investment } : inv
            )
          }
        }
      )

      // Invalidate related queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: portfolioKeys.summary() })
      queryClient.invalidateQueries({ queryKey: portfolioKeys.performance(portfolioId || '') })
    }

    // Portfolio summary update handler
    const handlePortfolioSummaryUpdate = (data: PortfolioWebSocketEvents['portfolio_summary_updated']) => {
      queryClient.setQueryData(portfolioKeys.summary(), (oldData: any) => ({
        ...oldData,
        ...data.summary
      }))
    }

    // Portfolio performance update handler
    const handlePortfolioPerformanceUpdate = (data: PortfolioWebSocketEvents['portfolio_performance_updated']) => {
      queryClient.setQueryData(
        portfolioKeys.performance(data.portfolio_id),
        (oldData: any) => oldData ? [...oldData, ...data.performance_data] : data.performance_data
      )
    }

    // Activity update handler
    const handleActivityUpdate = (data: PortfolioWebSocketEvents['portfolio_activity_added']) => {
      // Add new activity to the beginning of the list
      queryClient.setQueryData(
        portfolioKeys.activity(portfolioId || ''),
        (oldData: any) => {
          if (!oldData) return { data: [data.activity] }
          return {
            ...oldData,
            data: [data.activity, ...oldData.data]
          }
        }
      )
    }

    // Alert handler
    const handleAlert = (data: PortfolioWebSocketEvents['portfolio_alert_triggered']) => {
      // Show notification or update UI based on alert
      console.log('Portfolio alert:', data)

      // You could integrate with a toast notification system here
      if (data.severity === 'high') {
        // Show prominent notification for high-severity alerts
      }
    }

    // Valuation update handler
    const handleValuationUpdate = (data: PortfolioWebSocketEvents['investment_valuation_updated']) => {
      // Update specific investment valuation
      queryClient.setQueriesData(
        { queryKey: portfolioKeys.investment(data.investment_id) },
        (oldData: any) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            performance: {
              ...oldData.performance,
              current_value: data.new_value,
              unrealized_gain_loss_percentage: data.change_percentage
            }
          }
        }
      )

      // Update portfolio summary
      queryClient.invalidateQueries({ queryKey: portfolioKeys.summary() })
    }

    // Set up event listeners
    socket.on('investment_updated', handleInvestmentUpdate)
    socket.on('portfolio_summary_updated', handlePortfolioSummaryUpdate)
    socket.on('portfolio_performance_updated', handlePortfolioPerformanceUpdate)
    socket.on('portfolio_activity_added', handleActivityUpdate)
    socket.on('portfolio_alert_triggered', handleAlert)
    socket.on('investment_valuation_updated', handleValuationUpdate)

    // Cleanup function
    return () => {
      socket.off('investment_updated', handleInvestmentUpdate)
      socket.off('portfolio_summary_updated', handlePortfolioSummaryUpdate)
      socket.off('portfolio_performance_updated', handlePortfolioPerformanceUpdate)
      socket.off('portfolio_activity_added', handleActivityUpdate)
      socket.off('portfolio_alert_triggered', handleAlert)
      socket.off('investment_valuation_updated', handleValuationUpdate)
    }
  }, [socket, isConnected, queryClient, portfolioId])

  // Manual refresh function
  const refreshPortfolioData = useCallback(() => {
    if (portfolioId) {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.detail(portfolioId) })
      queryClient.invalidateQueries({ queryKey: portfolioKeys.summary() })
      queryClient.invalidateQueries({ queryKey: portfolioKeys.performance(portfolioId) })
      queryClient.invalidateQueries({ queryKey: portfolioKeys.activity(portfolioId) })
    }
  }, [queryClient, portfolioId])

  // Send manual update request
  const requestPortfolioUpdate = useCallback(() => {
    if (socket && isConnected && portfolioId) {
      socket.emit('request_portfolio_update', { portfolio_id: portfolioId })
    }
  }, [socket, isConnected, portfolioId])

  return {
    isConnected,
    refreshPortfolioData,
    requestPortfolioUpdate,
    connectionError: useWebSocketStore.getState().connectionError
  }
}

// Hook for real-time investment updates
export function useInvestmentRealtime(investmentId: string) {
  const queryClient = useQueryClient()
  const { socket, isConnected } = useWebSocketStore()

  useEffect(() => {
    if (!socket || !isConnected || !investmentId) return

    // Join investment-specific room
    socket.emit('join_investment_room', investmentId)

    const handleInvestmentUpdate = (data: { investment: Investment }) => {
      if (data.investment.id === investmentId) {
        queryClient.setQueryData(
          portfolioKeys.investment(investmentId),
          (oldData: any) => ({ ...oldData, ...data.investment })
        )
      }
    }

    const handleValuationUpdate = (data: { investment_id: string; new_value: number }) => {
      if (data.investment_id === investmentId) {
        queryClient.setQueryData(
          portfolioKeys.investment(investmentId),
          (oldData: any) => {
            if (!oldData) return oldData
            return {
              ...oldData,
              performance: {
                ...oldData.performance,
                current_value: data.new_value
              }
            }
          }
        )
      }
    }

    socket.on('investment_updated', handleInvestmentUpdate)
    socket.on('investment_valuation_updated', handleValuationUpdate)

    return () => {
      socket.off('investment_updated', handleInvestmentUpdate)
      socket.off('investment_valuation_updated', handleValuationUpdate)
      socket.emit('leave_investment_room', investmentId)
    }
  }, [socket, isConnected, investmentId, queryClient])

  return { isConnected }
}

// Hook for real-time portfolio alerts
export function usePortfolioAlertsRealtime() {
  const [alerts, setAlerts] = useState<any[]>([])
  const { socket, isConnected } = useWebSocketStore()

  useEffect(() => {
    if (!socket || !isConnected) return

    const handleAlert = (data: PortfolioWebSocketEvents['portfolio_alert_triggered']) => {
      const newAlert = {
        id: Date.now().toString(),
        type: data.alert_type,
        message: data.message,
        severity: data.severity,
        timestamp: new Date()
      }

      setAlerts(prev => [newAlert, ...prev.slice(0, 9)]) // Keep last 10 alerts
    }

    socket.on('portfolio_alert_triggered', handleAlert)

    return () => {
      socket.off('portfolio_alert_triggered', handleAlert)
    }
  }, [socket, isConnected])

  return { alerts, isConnected }
}