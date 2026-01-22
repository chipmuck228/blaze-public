import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// GET /api/public/instances?category=xxx
// 返回所有可用的 instances，按 franchise -> series -> instances 组织
// 使用新表：instance_v2 和 offerings_v2
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("category")

    // 使用新表：instance_v2 和 offerings_v2
    // 1. 获取所有活跃的 series/programs（包含 franchise 信息）
    let seriesQuery = supabaseAdmin
      .from("course_series")
      .select(`
        id,
        name,
        display_name,
        description,
        franchise_id,
        category_id,
        category:course_categories(
          id,
          name,
          display_name
        )
      `)
      .eq("is_active", true)
      .not("franchise_id", "is", null) // 只获取有 franchise_id 的 series

    // 如果指定了 category，则过滤
    if (categoryId) {
      seriesQuery = seriesQuery.eq("category_id", categoryId)
    }

    const { data: seriesData, error: seriesError } = await seriesQuery

    if (seriesError) {
      throw new Error(seriesError.message)
    }

    console.log(`[Public Instances API] Found ${seriesData?.length || 0} active series`)

    if (!seriesData || seriesData.length === 0) {
      return NextResponse.json({ franchises: [] }, { status: 200 })
    }

    // 2. 获取这些 series 的 series_ids
    const seriesIds = seriesData.map((s: any) => s.id)
    console.log(`[Public Instances API] Series IDs:`, seriesIds)

    // 3. 获取这些 series 下的所有 instances（从 instance_v2 表）
    const { data: instancesV2Data, error: instancesV2Error } = await supabaseAdmin
      .from("instance_v2")
      .select(`
        id,
        series_id,
        category_id,
        franchise_id,
        start_date,
        end_date,
        start_time,
        end_time,
        max_students,
        current_students,
        status,
        price_override,
        age_min,
        age_max,
        target_grades,
        location_id,
        location:course_locations(
          id,
          name,
          address,
          city,
          state
        ),
        offering:offerings_v2(
          id,
          name,
          slug,
          description,
          status,
          base_price,
          target_audience,
          learning_outcomes,
          prerequisites
        )
      `)
      .eq("is_active", true)
      .in("status", ["scheduled", "ongoing"])
      .in("series_id", seriesIds)
      .order("start_date", { ascending: true })
      .order("start_time", { ascending: true })

    if (instancesV2Error) {
      throw new Error(instancesV2Error.message)
    }

    console.log(`[Public Instances API] Found ${instancesV2Data?.length || 0} active instances from instance_v2`)

    const instancesV2 = instancesV2Data || []

    // 4. 获取所有相关的 franchises
    // course_series.franchise_id 可能指向旧表的 franchises.id，需要映射到新表
    const franchiseIds = new Set<string>()
    seriesData.forEach((s: any) => {
      if (s.franchise_id) {
        franchiseIds.add(s.franchise_id)
      }
    })
    instancesV2.forEach((inst: any) => {
      if (inst.franchise_id) {
        franchiseIds.add(inst.franchise_id)
      }
    })

    // 创建 franchise 映射：旧表 ID -> 新表 franchise 对象
    const franchiseMap = new Map<string, any>()
    
    // 首先尝试从 franchises_v2 获取
    const { data: franchisesV2Data } = await supabaseAdmin
      .from("franchises_v2")
      .select("id, code, name, legacy_franchise_id")
      .in("id", Array.from(franchiseIds))
      .eq("is_active", true)

    if (franchisesV2Data && franchisesV2Data.length > 0) {
      franchisesV2Data.forEach((f: any) => {
        franchiseMap.set(f.id, f)
        // 如果 legacy_franchise_id 存在，也建立映射
        if (f.legacy_franchise_id) {
          franchiseMap.set(f.legacy_franchise_id, f)
        }
      })
    }

    // 对于未找到的 franchise_id，尝试通过 legacy_franchise_id 映射
    const missingFranchiseIds = Array.from(franchiseIds).filter(id => !franchiseMap.has(id))
    if (missingFranchiseIds.length > 0) {
      try {
        const { getFranchiseV2ByLegacyId } = await import("@/lib/db-v2")
        for (const legacyId of missingFranchiseIds) {
          const franchiseV2 = await getFranchiseV2ByLegacyId(legacyId)
          if (franchiseV2) {
            // 使用新表的 ID 作为 key，但保留旧表 ID 的映射
            franchiseMap.set(legacyId, {
              id: franchiseV2.id,
              code: franchiseV2.code,
              name: franchiseV2.name,
            })
            franchiseMap.set(franchiseV2.id, {
              id: franchiseV2.id,
              code: franchiseV2.code,
              name: franchiseV2.name,
            })
          } else {
            // 如果新表没有，尝试从旧表获取（向后兼容）
            const { data: legacyFranchise } = await supabaseAdmin
              .from("franchises")
              .select("id, code, name")
              .eq("id", legacyId)
              .eq("is_active", true)
              .single()
            
            if (legacyFranchise) {
              franchiseMap.set(legacyId, legacyFranchise)
            }
          }
        }
      } catch (error) {
        console.warn(`[Public Instances API] Error fetching franchises:`, error)
      }
    }

    // 按 franchise -> series -> instances 组织数据
    const resultFranchiseMap = new Map<string, any>()

    // 1. 先添加所有 series/programs（即使没有 instances）
    for (const series of seriesData) {
      // 确保 series.id 不为空
      if (!series.id || series.id.trim() === '') {
        console.warn(`[Public Instances API] Skipping series with empty id`)
        continue
      }

      const category = Array.isArray(series.category) ? series.category[0] : series.category
      const franchiseId = series.franchise_id
      
      if (!franchiseId || franchiseId.trim() === '') continue

      // 获取 franchise 信息（可能来自新表或旧表）
      let franchise = franchiseMap.get(franchiseId)
      if (!franchise) {
        // 如果 franchise_id 是新表 ID，但数据在旧表，需要映射
        continue
      }

      // 确保 franchise.id 不为空
      if (!franchise.id || franchise.id.trim() === '') {
        console.warn(`[Public Instances API] Skipping franchise with empty id: ${franchiseId}`)
        continue
      }

      // 初始化 franchise
      if (!resultFranchiseMap.has(franchiseId)) {
        resultFranchiseMap.set(franchiseId, {
          id: franchise.id,
          code: franchise.code,
          name: franchise.name,
          programs: new Map(),
        })
      }

      const franchiseData = resultFranchiseMap.get(franchiseId)!

      // 添加 series/program（即使没有 instances）
      if (!franchiseData.programs.has(series.id)) {
        franchiseData.programs.set(series.id, {
          id: series.id,
          name: series.name,
          display_name: series.display_name,
          description: series.description,
          category: {
            id: category?.id,
            name: category?.name,
            display_name: category?.display_name,
          },
          instances: [],
        })
      }
    }

    // 2. 然后添加 instances
    for (const instance of instancesV2) {
      // 确保 instance.id 不为空
      if (!instance.id || instance.id.trim() === '') {
        console.warn(`[Public Instances API] Skipping instance with empty id`)
        continue
      }

      const seriesId = instance.series_id
      if (!seriesId || seriesId.trim() === '') continue

      // 获取 offering 信息
      const offering = Array.isArray(instance.offering) ? instance.offering[0] : instance.offering
      if (!offering || offering.status !== 'published') {
        continue
      }

      // 确保 offering.id 不为空
      if (!offering.id || offering.id.trim() === '') {
        console.warn(`[Public Instances API] Skipping instance with empty offering.id: instance.id=${instance.id}`)
        continue
      }

      // 找到对应的 series
      const series = seriesData.find((s: any) => s.id === seriesId)
      if (!series) continue

      const franchiseId = series.franchise_id
      if (!franchiseId) continue

      // 获取 franchise 信息
      let franchise = franchiseMap.get(franchiseId)
      if (!franchise) {
        continue
      }

      // 确保 franchise 和 series 在 map 中
      if (!resultFranchiseMap.has(franchiseId)) {
        resultFranchiseMap.set(franchiseId, {
          id: franchise.id,
          code: franchise.code,
          name: franchise.name,
          programs: new Map(),
        })
      }

      const franchiseData = resultFranchiseMap.get(franchiseId)!

      if (!franchiseData.programs.has(seriesId)) {
        // 如果 series 不在 map 中，从 seriesData 中查找
        const category = Array.isArray(series.category) ? series.category[0] : series.category
        franchiseData.programs.set(seriesId, {
          id: series.id,
          name: series.name,
          display_name: series.display_name,
          description: series.description,
          category: {
            id: category?.id,
            name: category?.name,
            display_name: category?.display_name,
          },
          instances: [],
        })
      }

      const targetSeries = franchiseData.programs.get(seriesId)
      if (!targetSeries) continue

      // 确保 instance.id 和 offering.id 不为空
      if (!instance.id || instance.id.trim() === '' || !offering.id || offering.id.trim() === '') {
        console.warn(`[Public Instances API] Skipping instance with empty id: instance.id=${instance.id}, offering.id=${offering.id}`)
        continue
      }

      // 添加 instance
      targetSeries.instances.push({
        id: instance.id,
        start_date: instance.start_date,
        end_date: instance.end_date,
        start_time: instance.start_time,
        end_time: instance.end_time,
        max_students: instance.max_students,
        current_students: instance.current_students,
        status: instance.status,
        price_override: instance.price_override,
        location: instance.location,
        course: {
          id: offering.id,
          name: offering.name,
          slug: offering.slug,
          description: offering.description,
          grade_level: Array.isArray(instance.target_grades) && instance.target_grades.length > 0 
            ? instance.target_grades[0] 
            : (instance.target_grades || null),
          target_grades: Array.isArray(instance.target_grades) 
            ? instance.target_grades 
            : (instance.target_grades ? [instance.target_grades] : null),
          age_min: instance.age_min || null,
          age_max: instance.age_max || null,
          base_price: offering.base_price,
        },
        available_spots: Math.max(0, (instance.max_students || 0) - (instance.current_students || 0)),
        is_full: (instance.max_students || 0) <= (instance.current_students || 0),
      })
    }

    // 转换为数组格式，只返回有 programs 的 franchises
    const result = Array.from(resultFranchiseMap.values())
      .filter((franchise) => franchise.programs.size > 0)
      .map((franchise: any) => ({
        id: franchise.id,
        code: franchise.code,
        name: franchise.name,
        programs: Array.from(franchise.programs.values()).map((program: any) => ({
          id: program.id,
          name: program.name,
          display_name: program.display_name,
          description: program.description,
          category: program.category,
          instances: program.instances || [],
        })),
      }))

    console.log(`[Public Instances API] Final result:`, {
      franchisesCount: result.length,
      franchises: result.map((f: any) => ({
        id: f.id,
        name: f.name,
        programsCount: f.programs.length,
        programs: f.programs.map((p: any) => ({
          id: p.id,
          display_name: p.display_name,
          instancesCount: p.instances.length,
        })),
      })),
    })

    return NextResponse.json({ franchises: result }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching instances:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch instances" },
      { status: 500 }
    )
  }
}
