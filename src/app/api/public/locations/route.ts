import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getFranchiseV2ByLegacyId } from "@/lib/db-v2"

// Public endpoint: 获取所有 active locations（带所属 franchise 基本信息）
// 使用新表：franchises_v2
// 只返回 is_active = true 的 locations 和 is_active = true 的 franchises
export async function GET() {
  try {
    // 先查询 locations（course_locations 表的 franchise_id 可能指向旧表）
    const { data: locationsData, error: locationsError } = await supabaseAdmin
      .from("course_locations")
      .select(`
        id,
        name,
        address,
        city,
        state,
        franchise_id
      `)
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (locationsError) {
      throw new Error(locationsError.message)
    }

    // 获取所有 franchises_v2
    const { data: franchisesV2Data, error: franchisesV2Error } = await supabaseAdmin
      .from("franchises_v2")
      .select("id, code, name, is_active, legacy_franchise_id")
      .eq("is_active", true)

    if (franchisesV2Error) {
      console.warn("Error fetching franchises_v2, falling back to old table:", franchisesV2Error)
    }

    // 创建映射：legacy_franchise_id -> franchises_v2
    const franchiseMap = new Map<string, any>()
    if (franchisesV2Data) {
      for (const fv2 of franchisesV2Data) {
        if (fv2.legacy_franchise_id) {
          franchiseMap.set(fv2.legacy_franchise_id, fv2)
        }
        // 也支持直接使用新表 ID
        franchiseMap.set(fv2.id, fv2)
      }
    }

    // 处理每个 location，查找对应的 franchise
    const enrichedLocations = await Promise.all((locationsData || []).map(async (location: any) => {
      if (!location.franchise_id) {
        return null
      }

      // 尝试从映射中查找
      let franchise = franchiseMap.get(location.franchise_id)
      
      // 如果没找到，尝试通过 legacy_franchise_id 查找
      if (!franchise) {
        try {
          franchise = await getFranchiseV2ByLegacyId(location.franchise_id)
        } catch (error) {
          console.warn(`Error fetching franchise_v2 for legacy_id ${location.franchise_id}:`, error)
        }
      }

      // 如果还是没找到，查询旧表（向后兼容）
      if (!franchise) {
        const { data: oldFranchise } = await supabaseAdmin
          .from("franchises")
          .select("id, code, name, is_active")
          .eq("id", location.franchise_id)
          .eq("is_active", true)
          .single()
        
        if (oldFranchise) {
          franchise = oldFranchise
        }
      }

      if (!franchise || !franchise.is_active) {
        return null
      }

      return {
        ...location,
        franchise: {
          id: franchise.id,
          code: franchise.code,
          name: franchise.name,
        }
      }
    }))

    // 过滤掉 null 值
    const filteredData = enrichedLocations.filter((loc: any) => loc !== null)

    return NextResponse.json(filteredData, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching public locations:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch locations" },
      { status: 500 }
    )
  }
}


