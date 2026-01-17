import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * POST /api/public/traffic/track
 * 追踪页面访问和页面浏览
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      session_id,
      page_path,
      referrer,
      user_agent,
      screen_width,
      screen_height,
      page_title,
      source_type,
      device_type,
      browser_name,
      os_name,
    } = body

    // 验证必需字段
    if (!session_id || !page_path || !user_agent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 获取 IP 地址
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      ''

    // 解析 referrer domain
    let referrerDomain = null
    if (referrer) {
      try {
        const referrerUrl = new URL(referrer)
        referrerDomain = referrerUrl.hostname
      } catch {
        // 忽略无效的 referrer URL
      }
    }

    // 检查 session 是否存在
    const { data: existingSession } = await supabaseAdmin
      .from('traffic_sessions')
      .select('id, pageview_count')
      .eq('session_id', session_id)
      .single()

    let sessionRecordId: string
    let shouldCreateNewVisit = false

    if (existingSession) {
      // 更新现有 session
      sessionRecordId = existingSession.id
      
      // 检查该 session 在最近 30 分钟内是否有 visit
      // 如果超过 30 分钟，视为新的访问会话
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      
      const { data: recentVisit } = await supabaseAdmin
        .from('traffic_visits')
        .select('id')
        .eq('session_id', session_id)
        .gte('created_at', thirtyMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!recentVisit) {
        // 没有最近的 visit，需要创建新的 visit（会话超时）
        shouldCreateNewVisit = true
      }

      const { error: updateError } = await supabaseAdmin
        .from('traffic_sessions')
        .update({
          last_visit_at: new Date().toISOString(),
          pageview_count: existingSession.pageview_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionRecordId)

      if (updateError) {
        console.error('Error updating session:', updateError)
      }
    } else {
      // 创建新 session，需要创建新的 visit
      shouldCreateNewVisit = true
      const { data: newSession, error: insertError } = await supabaseAdmin
        .from('traffic_sessions')
        .insert({
          session_id,
          first_visit_at: new Date().toISOString(),
          last_visit_at: new Date().toISOString(),
          visit_count: 1,
          pageview_count: 1,
          is_bounce: true, // 初始假设为跳出
        })
        .select('id')
        .single()

      if (insertError || !newSession) {
        console.error('Error creating session:', insertError)
        return NextResponse.json(
          { error: 'Failed to create session' },
          { status: 500 }
        )
      }

      sessionRecordId = newSession.id
    }

    let visitId: string

    if (shouldCreateNewVisit) {
      // 创建新的访问记录（新会话或会话超时）
      const { data: visit, error: visitError } = await supabaseAdmin
        .from('traffic_visits')
        .insert({
          session_id,
          page_path,
          referrer: referrer || null,
          referrer_domain: referrerDomain,
          source_type: source_type || 'other',
          device_type: device_type || 'desktop',
          browser_name: browser_name || 'Others',
          os_name: os_name || 'Other',
          user_agent: user_agent,
          ip_address: ipAddress || null,
          is_bounce: true, // 初始假设为跳出，后续更新
        })
        .select('id')
        .single()

      if (visitError || !visit) {
        console.error('Error creating visit:', visitError)
        return NextResponse.json(
          { error: 'Failed to track visit' },
          { status: 500 }
        )
      }

      visitId = visit.id

      // 如果是新 session，更新 visit_count
      if (!existingSession) {
        await supabaseAdmin
          .from('traffic_sessions')
          .update({
            visit_count: 1,
          })
          .eq('id', sessionRecordId)
      }
    } else {
      // 使用最近的 visit（同一会话内的页面刷新）
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const { data: recentVisit } = await supabaseAdmin
        .from('traffic_visits')
        .select('id')
        .eq('session_id', session_id)
        .gte('created_at', thirtyMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!recentVisit) {
        // 如果找不到最近的 visit，创建新的（兜底逻辑）
        const { data: visit, error: visitError } = await supabaseAdmin
          .from('traffic_visits')
          .insert({
            session_id,
            page_path,
            referrer: referrer || null,
            referrer_domain: referrerDomain,
            source_type: source_type || 'other',
            device_type: device_type || 'desktop',
            browser_name: browser_name || 'Others',
            os_name: os_name || 'Other',
            user_agent: user_agent,
            ip_address: ipAddress || null,
            is_bounce: true,
          })
          .select('id')
          .single()

        if (visitError || !visit) {
          console.error('Error creating visit (fallback):', visitError)
          return NextResponse.json(
            { error: 'Failed to track visit' },
            { status: 500 }
          )
        }
        visitId = visit.id
      } else {
        visitId = recentVisit.id
      }
    }

    // 创建页面浏览记录（每次页面加载都创建）
    const { error: pageviewError } = await supabaseAdmin
      .from('traffic_pageviews')
      .insert({
        visit_id: visitId,
        session_id,
        page_path,
        page_title: page_title || null,
      })

    if (pageviewError) {
      console.error('Error creating pageview:', pageviewError)
    }

    return NextResponse.json(
      {
        success: true,
        session_id,
        visit_id: visitId,
        is_new_visit: shouldCreateNewVisit,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error in traffic track:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to track traffic' },
      { status: 500 }
    )
  }
}
