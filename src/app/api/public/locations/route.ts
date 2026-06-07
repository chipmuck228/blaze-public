import { NextResponse } from "next/server"
import {getErrorMessage, type StringKeyRecord} from "@/lib/typed-error"
import { supabaseAdmin } from "@/lib/supabase"
import { unwrapRelation } from "@/lib/supabase-relation"
import { catalogFrom, catalogSelect, catalogTables, isCatalogV3 } from "@/lib/catalog-db"

interface FranchiseRef {
  id: string
  code: string
  name: string
  is_active?: boolean
}

// Public endpoint: 获取所有 active locations（带所属 franchise 基本信息）
// 优先使用 v2_campus 表（关联 v2_franchise），如果没有则回退到 course_locations
// 只返回 is_active = true 的 locations 和 is_active = true 的 franchises
export async function GET() {
  try {
    // 优先查询 v2_campus 表（新表，关联 v2_franchise）
    const parentEmbedFilter = isCatalogV3() ? "campus.is_active" : "franchise.is_active"

    const { data: v2Campuses, error: v2CampusesError } = await catalogFrom("location")
      .select(catalogSelect.locationWithCampus())
      .eq("is_active", true)
      .eq(parentEmbedFilter, true)
      .order("name", { ascending: true })

    // 如果 v2_campus / v3_location 有数据，直接使用
    if (!v2CampusesError && v2Campuses && v2Campuses.length > 0) {
      const enrichedLocations = v2Campuses.map((campus: Record<string, unknown>) => {
        const franchise = (
          unwrapRelation(campus.franchise) ?? unwrapRelation((campus as { campus?: unknown }).campus)
        ) as FranchiseRef | null
        return {
          id: campus.id,
          name: campus.display_name || campus.name,
          address: campus.address || undefined,
          city: campus.city || undefined,
          state: campus.state || undefined,
          zip_code: campus.zip_code || undefined,
          franchise: franchise
            ? { id: franchise.id, code: franchise.code, name: franchise.name }
            : undefined,
        }
      })

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
    const { data: v2Franchises, error: v2FranchisesError } = await catalogFrom("campus")
      .select("id, code, name, is_active")
      .eq("is_active", true)

    if (v2FranchisesError) {
      console.warn(`[${catalogTables.campus}] Error fetching:`, v2FranchisesError)
    }

    // 如果没有 v2_franchise 数据，尝试查询 franchises_v2（过渡表）
    const franchiseMap = new Map<string, FranchiseRef>()
    
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
      .map((location) => {
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
      .filter((loc) => loc !== null)

    // 过滤掉 null 值
    const filteredData = enrichedLocations.filter((loc) => loc !== null)

    return NextResponse.json(filteredData, { status: 200 })
  } catch (error: unknown) {
    console.error(`[${catalogTables.location}] Error fetching public locations:`, error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch locations" },
      { status: 500 }
    )
  }
}


