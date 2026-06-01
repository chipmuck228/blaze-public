import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from "@/lib/typed-error"
import { supabaseAdmin } from '@/lib/supabase'

/**
 * POST /api/public/traffic/track-exit
 * 追踪页面退出，用于判断跳出访问
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id } = body

    if (!session_id) {
      return NextResponse.json(
        { error: 'Missing session_id' },
        { status: 400 }
      )
    }

    // 获取 session 的 pageview_count
    const { data: session } = await supabaseAdmin
      .from('traffic_sessions')
      .select('id, pageview_count')
      .eq('session_id', session_id)
      .single()

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // 如果只有一个 pageview，标记为跳出
    if (session.pageview_count === 1) {
      await supabaseAdmin
        .from('traffic_sessions')
        .update({
          is_bounce: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.id)

      // 更新所有相关访问记录的 is_bounce
      await supabaseAdmin
        .from('traffic_visits')
        .update({
          is_bounce: true,
        })
        .eq('session_id', session_id)
    } else {
      // 多个 pageview，不是跳出
      await supabaseAdmin
        .from('traffic_sessions')
        .update({
          is_bounce: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.id)

      // 更新所有相关访问记录的 is_bounce
      await supabaseAdmin
        .from('traffic_visits')
        .update({
          is_bounce: false,
        })
        .eq('session_id', session_id)
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: unknown) {
    console.error('Error in traffic track-exit:', error)
    return NextResponse.json(
      { error: getErrorMessage(error) || 'Failed to track exit' },
      { status: 500 }
    )
  }
}
