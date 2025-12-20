import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// Public endpoint: 获取所有 active franchises（带 location 数量）
export async function GET() {
  try {
    // 获取所有 active franchises
    const { data: franchises, error: franchisesError } = await supabaseAdmin
      .from("franchises")
      .select("id, code, name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (franchisesError) {
      throw new Error(franchisesError.message)
    }

    // 获取每个 franchise 的 location 数量
    const { data: locations, error: locationsError } = await supabaseAdmin
      .from("course_locations")
      .select("franchise_id, is_active")
      .eq("is_active", true)

    if (locationsError) {
      throw new Error(locationsError.message)
    }

    // 计算每个 franchise 的 location 数量
    const locationCounts = new Map<string, number>()
    locations?.forEach((loc) => {
      if (loc.franchise_id) {
        locationCounts.set(
          loc.franchise_id,
          (locationCounts.get(loc.franchise_id) || 0) + 1
        )
      }
    })

    // 为每个 franchise 添加 location_count
    const franchisesWithCounts = (franchises || []).map((franchise) => ({
      ...franchise,
      location_count: locationCounts.get(franchise.id) || 0,
    }))

    return NextResponse.json(franchisesWithCounts, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching franchises:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch franchises" },
      { status: 500 }
    )
  }
}

