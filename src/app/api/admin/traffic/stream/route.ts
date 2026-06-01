import { NextRequest } from 'next/server'
import { getErrorCode, getErrorMessage } from "@/lib/typed-error"
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getDateRangeFromParams } from '@/lib/traffic-api-utils'

/**
 * GET /api/admin/traffic/stream
 * Server-Sent Events (SSE) 实时流量数据流
 */
export async function GET(request: NextRequest) {
  try {
    // 检查权限
    const session = await auth()
    if (!session?.user || session.user.role !== 'admin') {
      return new Response('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')
    const startDateParam = searchParams.get('start_date')
    const endDateParam = searchParams.get('end_date')

    // 创建 ReadableStream 用于 SSE
    const encoder = new TextEncoder()
    let intervalId: NodeJS.Timeout | null = null
    let isStreamClosed = false

    const stream = new ReadableStream({
      async start(controller) {
        // 发送初始数据
        const sendData = async () => {
          // 检查流是否已关闭
          if (isStreamClosed) {
            return
          }

          try {
            // 每次查询时重新计算日期范围，确保 endDate 是当前时间
            // 这样新创建的 pageview 和 visit 会被包含在查询中
            const dateRange = getDateRangeFromParams(period, startDateParam, endDateParam)
            
            console.log('[SSE Stream] Querying with date range:', {
              start: dateRange.startStr,
              end: dateRange.endStr,
              period,
              startDateParam,
              endDateParam,
            })

            // 获取当前周期的访问量
            const { count: currentVisits, error: visitsError } = await supabaseAdmin
              .from('traffic_visits')
              .select('*', { count: 'exact', head: true })
              .gte('created_at', dateRange.startStr)
              .lte('created_at', dateRange.endStr)

            if (visitsError) {
              console.error('[SSE Stream] Error fetching visits:', visitsError)
            }

            // 获取当前周期的页面浏览量
            const { count: currentPageviews, error: pageviewsError } = await supabaseAdmin
              .from('traffic_pageviews')
              .select('*', { count: 'exact', head: true })
              .gte('created_at', dateRange.startStr)
              .lte('created_at', dateRange.endStr)

            if (pageviewsError) {
              console.error('[SSE Stream] Error fetching pageviews:', pageviewsError)
            }

            // 获取当前周期的唯一访客数
            const { data: currentUniqueSessions } = await supabaseAdmin
              .from('traffic_sessions')
              .select('session_id')
              .gte('first_visit_at', dateRange.startStr)
              .lte('first_visit_at', dateRange.endStr)

            const currentUniqueVisitors = new Set(
              currentUniqueSessions?.map((s) => s.session_id) || []
            ).size

            // 获取当前周期的跳出访问量
            const { count: currentBounces } = await supabaseAdmin
              .from('traffic_visits')
              .select('*', { count: 'exact', head: true })
              .gte('created_at', dateRange.startStr)
              .lte('created_at', dateRange.endStr)
              .eq('is_bounce', true)

            const bounceRate =
              (currentVisits || 0) > 0
                ? ((currentBounces || 0) / (currentVisits || 0)) * 100
                : 0

            const data = {
              visits: currentVisits || 0,
              pageviews: currentPageviews || 0,
              unique_visitors: currentUniqueVisitors,
              bounce_rate: Math.round(bounceRate * 100) / 100,
              timestamp: new Date().toISOString(),
            }

            console.log('[SSE Stream] Query result:', {
              dateRange: {
                start: dateRange.startStr,
                end: dateRange.endStr,
              },
              visits: currentVisits || 0,
              pageviews: currentPageviews || 0,
              unique_visitors: currentUniqueVisitors,
              bounce_rate: Math.round(bounceRate * 100) / 100,
            })

            // 再次检查流是否已关闭（在数据库查询后）
            if (isStreamClosed) {
              return
            }

            // 发送数据
            const message = `data: ${JSON.stringify(data)}\n\n`
            controller.enqueue(encoder.encode(message))
            console.log('[SSE Stream] Data sent:', data)
          } catch (error: unknown) {
            // 如果流已关闭，忽略错误
            if (isStreamClosed) {
              return
            }

            // 检查是否是流关闭错误
            if (
              getErrorMessage(error).includes("closed") ||
              getErrorCode(error) === "ERR_INVALID_STATE"
            ) {
              isStreamClosed = true
              return
            }

            console.error('Error in SSE stream:', error)
            
            // 只有在流未关闭时才发送错误消息
            if (!isStreamClosed) {
              try {
                const errorMessage = `data: ${JSON.stringify({ error: 'Failed to fetch data' })}\n\n`
                controller.enqueue(encoder.encode(errorMessage))
              } catch (enqueueError) {
                // 如果 enqueue 失败，流可能已关闭
                isStreamClosed = true
              }
            }
          }
        }

        // 立即发送一次数据
        await sendData()
        console.log('[SSE Stream] Initial data sent')

        // 每 30 秒更新一次数据
        intervalId = setInterval(async () => {
          console.log('[SSE Stream] Sending periodic update...')
          await sendData()
        }, 30000) // 30 秒
      },
      cancel() {
        // 标记流已关闭
        isStreamClosed = true
        
        // 清理定时器
        if (intervalId) {
          clearInterval(intervalId)
          intervalId = null
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
      },
    })
  } catch (error: unknown) {
    console.error('Error creating SSE stream:', error)
    return new Response(
      `data: ${JSON.stringify({ error: getErrorMessage(error) || 'Failed to create stream' })}\n\n`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
        },
      }
    )
  }
}
