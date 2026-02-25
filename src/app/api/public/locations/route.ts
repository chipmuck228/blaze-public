import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// Public endpoint: 获取所有 active locations（带所属 franchise 基本信息）
// 优先使用 v2_campus 表（关联 v2_franchise），如果没有则回退到 course_locations
// 只返回 is_active = true 的 locations 和 is_active = true 的 franchises
export async function GET() {
  try {
    // 优先查询 v2_campus 表（新表，关联 v2_franchise）
    const { data: v2Campuses, error: v2CampusesError } = await supabaseAdmin
      .from("v2_campus")
      .select(`
        id,
        name,
        display_name,
        address,
        city,
        state,
        zip_code,
        franchise:v2_franchise!inner(
          id,
          code,
          name,
          is_active
        )
      `)
      .eq("is_active", true)
      .eq("franchise.is_active", true)
      .order("name", { ascending: true })

    // 如果 v2_campus 有数据，直接使用
    if (!v2CampusesError && v2Campuses && v2Campuses.length > 0) {
      const enrichedLocations = v2Campuses.map((campus: any) => ({
        id: campus.id,
        name: campus.display_name || campus.name,
        address: campus.address || undefined,
        city: campus.city || undefined,
        state: campus.state || undefined,
        zip_code: campus.zip_code || undefined,
        franchise: {
          id: campus.franchise.id,
          code: campus.franchise.code,
          name: campus.franchise.name,
        }
      }))

      return NextResponse.json(enrichedLocations, { status: 200 })
    }

    // 回退：查询 course_locations 表（旧表，需要映射到 v2_franchise）
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

    // 获取所有 v2_franchise（新表）
    const { data: v2Franchises, error: v2FranchisesError } = await supabaseAdmin
      .from("v2_franchise")
      .select("id, code, name, is_active")
      .eq("is_active", true)

    if (v2FranchisesError) {
      console.warn("Error fetching v2_franchise:", v2FranchisesError)
    }

    // 如果没有 v2_franchise 数据，尝试查询 franchises_v2（过渡表）
    let franchiseMap = new Map<string, any>()
    
    if (v2Franchises && v2Franchises.length > 0) {
      // 使用 v2_franchise
      for (const f of v2Franchises) {
        franchiseMap.set(f.id, f)
      }
    } else {
      // 回退到 franchises_v2
      const { data: franchisesV2Data } = await supabaseAdmin
        .from("franchises_v2")
        .select("id, code, name, is_active, legacy_franchise_id")
        .eq("is_active", true)

      if (franchisesV2Data) {
        for (const fv2 of franchisesV2Data) {
          if (fv2.legacy_franchise_id) {
            franchiseMap.set(fv2.legacy_franchise_id, fv2)
          }
          franchiseMap.set(fv2.id, fv2)
        }
      }
    }

    // 处理每个 location，查找对应的 franchise
    const enrichedLocations = (locationsData || [])
      .map((location: any) => {
        if (!location.franchise_id) {
          return null
        }

        // 尝试从映射中查找
        const franchise = franchiseMap.get(location.franchise_id)

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
      })
      .filter((loc: any) => loc !== null)

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


