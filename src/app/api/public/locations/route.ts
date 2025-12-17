import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// Public endpoint: 获取所有 active locations（带所属 franchise 基本信息）
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("course_locations")
      .select(`
        id,
        name,
        address,
        city,
        state,
        franchise:franchises (
          id,
          code,
          name
        )
      `)
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(data || [], { status: 200 })
  } catch (error: any) {
    console.error("Error fetching public locations:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch locations" },
      { status: 500 }
    )
  }
}


