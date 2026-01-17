import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有 featured categories（公开 API）
export async function GET() {
  try {
    // 只获取活跃且 featured 的类别
    const { data, error } = await supabaseAdmin
      .from('course_categories')
      .select('id, name, display_name, description, poster_url, featured_slogan, featured_subtitle, featured_display_order')
      .eq('is_active', true)
      .eq('featured', true)
      .order('featured_display_order', { ascending: true })
      .order('display_order', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch featured categories: ${error.message}`)
    }

    return NextResponse.json({ categories: data || [] }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching featured categories:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch featured categories" },
      { status: 500 }
    )
  }
}
