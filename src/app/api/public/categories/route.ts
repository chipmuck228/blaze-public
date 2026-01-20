import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有活跃的课程类别（公开 API）
export async function GET() {
  try {
    console.log('[Categories API] Fetching categories...');
    
    // 检查环境变量
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl) {
      console.error('[Categories API] Missing NEXT_PUBLIC_SUPABASE_URL');
      return NextResponse.json(
        { error: "Server configuration error: Missing Supabase URL" },
        { status: 500 }
      );
    }
    
    // 只获取活跃的类别（is_active = true）
    const { data, error } = await supabaseAdmin
      .from('course_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[Categories API] Supabase error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Failed to fetch course categories: ${error.message}`)
    }

    console.log(`[Categories API] Successfully fetched ${data?.length || 0} categories`);
    return NextResponse.json({ categories: data || [] }, { status: 200 })
  } catch (error: any) {
    console.error("[Categories API] Error fetching categories:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
      error: error
    });
    
    // 如果是网络错误，返回更友好的错误信息
    if (error.message?.includes('fetch failed') || error.name === 'TypeError' || error.cause?.code === 'ECONNREFUSED') {
      console.error('[Categories API] Network connection error - Supabase may be unreachable');
      return NextResponse.json(
        { error: "Database connection failed. Please check your network connection and try again later." },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to fetch categories" },
      { status: 500 }
    )
  }
}

