import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有活跃的课程类别（公开 API）
export async function GET() {
  try {
    // 只获取活跃的类别（is_active = true）
    const { data, error } = await supabaseAdmin
      .from('course_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch course categories: ${error.message}`)
    }

    return NextResponse.json({ categories: data || [] }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching categories:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch categories" },
      { status: 500 }
    )
  }
}

