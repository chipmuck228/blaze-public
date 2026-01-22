import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取层级数据：Franchise -> Category -> Series -> Instances
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. 获取所有活跃的 franchises
    const { data: franchisesData, error: franchisesError } = await supabaseAdmin
      .from("franchises")
      .select("id, code, name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (franchisesError) {
      throw new Error(franchisesError.message)
    }

    // 2. 获取所有活跃的 categories
    const { data: categoriesData, error: categoriesError } = await supabaseAdmin
      .from("course_categories")
      .select("id, name, display_name, is_active")
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (categoriesError) {
      throw new Error(categoriesError.message)
    }

    // 3. 获取所有活跃的 series（包含 franchise 和 category 信息）
    const { data: seriesData, error: seriesError } = await supabaseAdmin
      .from("course_series")
      .select(`
        id,
        name,
        display_name,
        description,
        franchise_id,
        category_id,
        is_active,
        franchise:franchises(id, code, name),
        category:course_categories(id, name, display_name)
      `)
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (seriesError) {
      throw new Error(seriesError.message)
    }

    // 4. 获取所有活跃的 instances_v2（新表）
    const { data: instancesV2Data, error: instancesV2Error } = await supabaseAdmin
      .from("instance_v2")
      .select(`
        id,
        series_id,
        offering_id,
        start_date,
        end_date,
        start_time,
        end_time,
        max_students,
        current_students,
        status,
        price_override,
        is_active,
        offering:offerings_v2(
          id,
          name,
          slug,
          description,
          base_price,
          offering_type
        )
      `)
      .eq("is_active", true)
      .in("status", ["scheduled", "ongoing"])

    if (instancesV2Error) {
      console.warn("Error fetching instances_v2:", instancesV2Error)
      // 不抛出错误，继续处理（向后兼容）
    }

    // 5. 组织层级结构
    const hierarchy: any[] = []

    // 按 franchise 分组
    const franchiseMap = new Map<string, any>()

    // 先添加所有 franchises（包括没有 series 的）
    for (const franchise of franchisesData || []) {
      franchiseMap.set(franchise.id, {
        id: franchise.id,
        code: franchise.code,
        name: franchise.name,
        categories: new Map<string, any>(),
      })
    }

    // 添加 "Global / Unassigned" franchise（用于没有 franchise_id 的 series）
    const globalFranchiseId = "global"
    franchiseMap.set(globalFranchiseId, {
      id: globalFranchiseId,
      code: "global",
      name: "Global / Unassigned",
      categories: new Map<string, any>(),
    })

    // 按 category 分组 series
    for (const series of seriesData || []) {
      const franchiseId = series.franchise_id || globalFranchiseId
      const franchise = franchiseMap.get(franchiseId)
      if (!franchise) continue

      const categoryId = series.category_id
      if (!franchise.categories.has(categoryId)) {
        const category = categoriesData?.find((c) => c.id === categoryId)
        if (category) {
          franchise.categories.set(categoryId, {
            id: category.id,
            name: category.name,
            display_name: category.display_name,
            series: [],
          })
        }
      }

      const categoryData = franchise.categories.get(categoryId)
      if (categoryData) {
        // 获取该 series 下的所有 instances_v2（新表）
        const instancesV2 = (instancesV2Data || [])
          .filter((inst) => inst.series_id === series.id)
          .map((inst) => {
            const offering = Array.isArray(inst.offering) ? inst.offering[0] : inst.offering
            return {
              id: inst.id,
              offering_id: inst.offering_id,
              start_date: inst.start_date,
              end_date: inst.end_date,
              start_time: inst.start_time,
              end_time: inst.end_time,
              max_students: inst.max_students,
              current_students: inst.current_students,
              status: inst.status,
              price_override: inst.price_override,
              offering: offering
                ? {
                    id: offering.id,
                    name: offering.name,
                    slug: offering.slug,
                    description: offering.description,
                    base_price: offering.base_price,
                    offering_type: offering.offering_type,
                  }
                : null,
            }
          })

        categoryData.series.push({
          id: series.id,
          name: series.name,
          display_name: series.display_name,
          description: series.description,
          instances: instancesV2,
        })
      }
    }

    // 转换为数组格式
    for (const franchise of franchiseMap.values()) {
      const categories = Array.from(franchise.categories.values()).map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        display_name: cat.display_name,
        series: cat.series,
      }))

      // 只包含有 series 的 franchise
      if (categories.length > 0) {
        hierarchy.push({
          ...franchise,
          categories: categories,
        })
      }
    }

    return NextResponse.json({ hierarchy }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching hierarchy:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch hierarchy" },
      { status: 500 }
    )
  }
}

