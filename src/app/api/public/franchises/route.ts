import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { supabaseAdmin } from "@/lib/supabase"
interface PublicFranchiseRow {
  id: string
  code: string
  name: string
  is_active?: boolean
  legacy_franchise_id?: string | null
}

// Public endpoint: 获取所有 active franchises（带 location 数量）
// 使用新表：franchises_v2
export async function GET() {
  try {
    // 优先从 franchises_v2 获取所有 active franchises
    const { data: franchisesV2, error: franchisesV2Error } = await supabaseAdmin
      .from("franchises_v2")
      .select("id, code, name, is_active, legacy_franchise_id")
      .eq("is_active", true)
      .order("name", { ascending: true })

    let franchises: PublicFranchiseRow[] = []
    
    if (franchisesV2Error) {
      console.warn("[v2_franchise] Error fetching, falling back to legacy franchises table:", franchisesV2Error)
      // 向后兼容：查询旧表
      const { data: oldFranchises, error: oldError } = await supabaseAdmin
        .from("franchises")
        .select("id, code, name, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true })
      
      if (oldError) {
        throw new Error(oldError.message)
      }
      franchises = (oldFranchises || []) as PublicFranchiseRow[]
    } else {
      franchises = (franchisesV2 || []) as PublicFranchiseRow[]
    }

    // 创建映射：legacy_franchise_id -> franchises_v2.id
    const legacyToNewMap = new Map<string, string>()
    if (franchisesV2) {
      for (const fv2 of franchisesV2) {
        if (fv2.legacy_franchise_id) {
          legacyToNewMap.set(fv2.legacy_franchise_id, fv2.id)
        }
      }
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
    // 需要处理 franchise_id 可能是旧表 ID 的情况
    const locationCounts = new Map<string, number>()
    locations?.forEach((loc) => {
      if (loc.franchise_id) {
        // 如果 franchise_id 是旧表 ID，映射到新表 ID
        const franchiseId = legacyToNewMap.get(loc.franchise_id) || loc.franchise_id
        locationCounts.set(
          franchiseId,
          (locationCounts.get(franchiseId) || 0) + 1
        )
      }
    })

    // 为每个 franchise 添加 location_count
    const franchisesWithCounts = franchises.map((franchise) => ({
      id: franchise.id,
      code: franchise.code,
      name: franchise.name,
      location_count: locationCounts.get(franchise.id) || 0,
    }))

    return NextResponse.json(franchisesWithCounts, { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching franchises:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch franchises" },
      { status: 500 }
    )
  }
}

