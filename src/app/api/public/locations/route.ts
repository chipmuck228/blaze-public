import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// Public endpoint: 获取所有 active locations（带所属 franchise 基本信息）
// 只返回 is_active = true 的 locations 和 is_active = true 的 franchises
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
          name,
          is_active
        )
      `)
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    // 过滤掉 franchise.is_active = false 的记录
    // 以及没有关联 franchise 的记录
    const filteredData = (data || []).filter((location: any) => {
      // 如果没有关联的 franchise，过滤掉
      if (!location.franchise) {
        return false
      }
      // 如果 franchise.is_active = false，过滤掉
      if (location.franchise.is_active === false) {
        return false
      }
      return true
    })

    // 移除 franchise.is_active 字段（不需要返回给前端）
    const cleanedData = filteredData.map((location: any) => {
      const { is_active, ...franchiseWithoutActive } = location.franchise
      return {
        ...location,
        franchise: franchiseWithoutActive
      }
    })

    return NextResponse.json(cleanedData, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching public locations:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch locations" },
      { status: 500 }
    )
  }
}


