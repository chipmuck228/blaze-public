'use client'

import { getErrorMessage } from "@/lib/typed-error"
import { useEffect, useRef, useState, useCallback } from 'react'

interface TrafficSSEData {
  visits: number
  pageviews: number
  unique_visitors: number
  bounce_rate: number
  timestamp: string
}

interface UseTrafficSSEOptions {
  period?: string | null
  startDate?: string | null
  endDate?: string | null
  enabled?: boolean
  onUpdate?: (data: TrafficSSEData) => void
}

export function useTrafficSSE({
  period,
  startDate,
  endDate,
  enabled = true,
  onUpdate,
}: UseTrafficSSEOptions) {
  const [data, setData] = useState<TrafficSSEData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const onUpdateRef = useRef(onUpdate)
  const connectRef = useRef<() => void>(() => {})

  // 使用 useRef 存储 onUpdate 回调，避免触发重新连接
  useEffect(() => {
    onUpdateRef.current = onUpdate
  }, [onUpdate])

  const connect = useCallback(() => {
    if (!enabled) return

    // 关闭现有连接
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    // 构建查询字符串
    const params = new URLSearchParams()
    if (startDate && endDate) {
      params.append('start_date', startDate)
      params.append('end_date', endDate)
    } else if (period) {
      params.append('period', period)
    } else {
      params.append('period', 'last_30_days')
    }

    const url = `/api/admin/traffic/stream?${params.toString()}`

    try {
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log('[SSE] Connection opened')
        setIsConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0
      }

      eventSource.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data) as TrafficSSEData | { error: string }

          if ('error' in parsedData) {
            console.error('[SSE] Error from server:', parsedData.error)
            setError(parsedData.error)
            return
          }

          console.log('[SSE] Received data:', parsedData)
          setData(parsedData)
          
          // 使用 ref 中的最新回调
          if (onUpdateRef.current) {
            onUpdateRef.current(parsedData)
          }
        } catch (err) {
          console.error('[SSE] Error parsing SSE data:', err)
          setError('Failed to parse data')
        }
      }

      eventSource.onerror = (err) => {
        console.error('[SSE] Connection error:', err, 'ReadyState:', eventSource.readyState)
        setIsConnected(false)

        // 如果连接关闭，尝试重连
        if (eventSource.readyState === EventSource.CLOSED) {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000) // 指数退避，最多 30 秒
            console.log(`[SSE] Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)

            reconnectTimeoutRef.current = setTimeout(() => {
              connectRef.current()
            }, delay)
          } else {
            console.error('[SSE] Max reconnection attempts reached')
            setError('Failed to connect after multiple attempts')
          }
        }
      }
    } catch (err: unknown) {
      console.error('[SSE] Error creating EventSource:', err)
      setError(getErrorMessage(err) || 'Failed to create connection')
    }
  }, [enabled, period, startDate, endDate])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    if (enabled) {
      console.log('[SSE] Connecting...', { period, startDate, endDate })
      connect()
    } else {
      console.log('[SSE] Disabled, closing connection')
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      setIsConnected(false)
    }

    return () => {
      console.log('[SSE] Cleaning up connection')
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [enabled, period, startDate, endDate, connect])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    setIsConnected(false)
  }, [])

  return {
    data,
    isConnected,
    error,
    connect,
    disconnect,
  }
}
