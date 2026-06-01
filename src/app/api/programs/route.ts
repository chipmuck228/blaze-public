import { NextResponse } from "next/server"
import {getErrorMessage, type StringKeyRecord} from "@/lib/typed-error"
import { getFranchiseByCode } from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase"
import { unwrapRelation } from "@/lib/supabase-relation"

interface ProgramCourseEntry {
  id: string
  title: string
  slug?: string
  poster_url?: string
  description?: string
  gradeLevel: string
  instances: Array<Record<string, unknown>>
}

interface ProgramSeriesEntry {
  id: string
  name: string
  display_name: string
  description: string | null
  start_date: string
  end_date: string
  category: { id: string; name: string; display_name: string } | null
  courses: Map<string, ProgramCourseEntry>
}

// GET /api/programs?franchise=code
// 返回某个 franchise 下的所有 series/programs 以及每个 program 下的 offerings（通过 instances）
// 使用新表：instance_v2 和 offerings_v2
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const franchiseCode = searchParams.get("franchise")

    if (!franchiseCode) {
      return NextResponse.json(
        { error: "franchise query parameter is required" },
        { status: 400 }
      )
    }

    const franchise = await getFranchiseByCode(franchiseCode)
    console.log(`[Programs API] Franchise lookup for code "${franchiseCode}":`, franchise ? { id: franchise.id, code: franchise.code, name: franchise.name } : null)
    if (!franchise) {
      return NextResponse.json(
        { error: "Invalid franchise code" },
        { status: 400 }
      )
    }

    // 获取 franchise 的 legacy_franchise_id（如果存在）
    // 因为 course_series.franchise_id 可能指向旧表的 franchises.id
    let legacyFranchiseId: string | null = null
    try {
      const { getFranchiseV2ByCode } = await import("@/lib/db-v2")
      const franchiseV2 = await getFranchiseV2ByCode(franchiseCode.toLowerCase())
      if (franchiseV2 && franchiseV2.legacy_franchise_id) {
        legacyFranchiseId = franchiseV2.legacy_franchise_id
        console.log(`[Programs API] Found legacy_franchise_id: ${legacyFranchiseId} for franchise ${franchiseCode}`)
      }
    } catch (error) {
      console.warn(`[v2_franchise] Error fetching for legacy mapping:`, error)
    }

    // 1. 获取该 franchise 下的所有 series/programs
    // 需要同时匹配新表 ID 和旧表 ID（如果存在）
    let seriesQuery = supabaseAdmin
      .from("course_series")
      .select(`
        id,
        category_id,
        name,
        display_name,
        description,
        start_date,
        end_date,
        display_order,
        is_active,
        franchise_id,
        category:course_categories(
          id,
          name,
          display_name
        )
      `)
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    // 如果 franchise.id 是新表 ID，需要同时查询新表 ID 和旧表 ID
    if (legacyFranchiseId) {
      // 同时匹配新表 ID 和旧表 ID
      seriesQuery = seriesQuery.in("franchise_id", [franchise.id, legacyFranchiseId])
      console.log(`[Programs API] Querying series with franchise_id IN [${franchise.id}, ${legacyFranchiseId}]`)
    } else {
      // 只匹配当前 ID（可能是旧表 ID）
      seriesQuery = seriesQuery.eq("franchise_id", franchise.id)
      console.log(`[Programs API] Querying series with franchise_id = ${franchise.id}`)
    }

    const { data: seriesData, error: seriesError } = await seriesQuery

    if (seriesError) {
      throw new Error(seriesError.message)
    }

    const seriesList = seriesData || []
    console.log(`[Programs API] Found ${seriesList.length} active series for franchise ${franchise.code}`)
    if (seriesList.length === 0) {
      console.log(`[Programs API] No active series found for franchise ${franchise.code}, returning empty array`)
      return NextResponse.json([], { status: 200 })
    }

    const seriesIds = seriesList.map((s) => s.id)
    console.log(`[Programs API] Series IDs to query instances:`, seriesIds)

    // 2. 直接查询 instance_v2 表，获取该 franchise 下的所有 instances
    // 注意：需要处理 franchise_id 可能是旧表 ID 的情况
    let instancesQuery = supabaseAdmin
      .from("instance_v2")
      .select(`
        id,
        offering_id,
        series_id,
        start_date,
        end_date,
        start_time,
        end_time,
        max_students,
        current_students,
        status,
        price_override,
        is_active,
        franchise_id,
        location_id,
        location:course_locations(
          id,
          name,
          address,
          city,
          state,
          zip_code
        ),
        offering:offerings_v2(
          id,
          name,
          slug,
          description,
          poster_url,
          offering_type,
          status,
          base_price
        )
      `)
      .in("series_id", seriesIds)
      .eq("is_active", true)
      .in("status", ["scheduled", "ongoing"])
      .order("start_date", { ascending: true })
      .order("start_time", { ascending: true })

    // 如果存在 legacy_franchise_id，同时匹配新表 ID 和旧表 ID
    if (legacyFranchiseId) {
      instancesQuery = instancesQuery.or(`franchise_id.is.null,franchise_id.eq.${franchise.id},franchise_id.eq.${legacyFranchiseId}`)
      console.log(`[Programs API] Querying instances with franchise_id IN [null, ${franchise.id}, ${legacyFranchiseId}]`)
    } else {
      instancesQuery = instancesQuery.or(`franchise_id.is.null,franchise_id.eq.${franchise.id}`)
      console.log(`[Programs API] Querying instances with franchise_id IN [null, ${franchise.id}]`)
    }

    const { data: instancesV2Data, error: instancesV2Error } = await instancesQuery

    if (instancesV2Error) {
      console.error(`[v2_instance] Error fetching:`, instancesV2Error)
      throw new Error(instancesV2Error.message)
    }

    // 过滤 instances：只保留 franchise_id 匹配或为 null 的 instances
    // 如果 franchise_id 为 null，我们通过 series_id 的关系已经验证了它属于该 franchise
    const filteredInstances = (instancesV2Data || []).filter((inst) => {
      // 如果 franchise_id 匹配（新表或旧表），或者为 null（通过 series 关系验证），则保留
      const matches = !inst.franchise_id || 
                     inst.franchise_id === franchise.id || 
                     (legacyFranchiseId && inst.franchise_id === legacyFranchiseId)
      if (!matches) {
        console.log(`[Programs API] Filtering out instance ${inst.id}: franchise_id mismatch (${inst.franchise_id} not in [${franchise.id}, ${legacyFranchiseId || 'N/A'}])`)
      }
      return matches
    })

    console.log(`[Programs API] Found ${filteredInstances.length} instances for franchise ${franchise.code}`)

    // 3. 按 series_id 分组 instances
    const instancesBySeries = new Map<string, Array<Record<string, unknown>>>()
    for (const instance of filteredInstances) {
      const seriesId = instance.series_id
      if (!instancesBySeries.has(seriesId)) {
        instancesBySeries.set(seriesId, [])
      }
      
      const offering = Array.isArray(instance.offering) ? instance.offering[0] : instance.offering
      
      // 只包含 published 状态的 offerings
      if (!offering || offering.status !== 'published') {
        console.log(`[Programs API] Skipping instance ${instance.id}: offering not published (status: ${offering?.status})`)
        continue
      }

      instancesBySeries.get(seriesId)!.push({
        id: instance.id,
        offering_id: instance.offering_id,
        location_id: instance.location_id,
        start_date: instance.start_date,
        end_date: instance.end_date,
        start_time: instance.start_time,
        end_time: instance.end_time,
        max_students: instance.max_students,
        current_students: instance.current_students,
        available_spots: (instance.max_students || 0) - (instance.current_students || 0),
        is_full: (instance.current_students || 0) >= (instance.max_students || 0),
        status: instance.status,
        price_override: instance.price_override,
        location: instance.location,
        offering: {
          id: offering.id,
          name: offering.name,
          slug: offering.slug,
          description: offering.description,
          poster_url: offering.poster_url,
          offering_type: offering.offering_type,
          base_price: offering.base_price,
        },
      })
    }

    // 4. 按 offering_id 分组 instances，然后按 series 组织
    // 每个 series 包含多个 offerings，每个 offering 有多个 instances
    const seriesMap = new Map<string, ProgramSeriesEntry>()
    for (const s of seriesList) {
      seriesMap.set(s.id, {
        id: s.id,
        name: s.name,
        display_name: s.display_name,
        description: s.description,
        start_date: s.start_date,
        end_date: s.end_date,
        category: (() => {
          const category = unwrapRelation(s.category)
          return category
            ? {
                id: category.id,
                name: category.name,
                display_name: category.display_name,
              }
            : null
        })(),
        courses: new Map<string, ProgramCourseEntry>(), // 使用 Map 去重 offerings（key: offering_id）
      })
    }

    // 5. 将 instances 按 offering 分组，添加到对应的 series
    for (const instance of filteredInstances) {
      const seriesId = instance.series_id
      const seriesEntry = seriesMap.get(seriesId)
      if (!seriesEntry) {
        console.log(`[Programs API] Warning: Series entry not found for seriesId ${seriesId}`)
        continue
      }

      const offering = Array.isArray(instance.offering) ? instance.offering[0] : instance.offering
      if (!offering || offering.status !== 'published') {
        continue
      }

      const offeringId = offering.id
      if (!seriesEntry.courses.has(offeringId)) {
        seriesEntry.courses.set(offeringId, {
          id: offering.id,
          title: offering.name,
          slug: offering.slug || undefined,
          poster_url: offering.poster_url || undefined,
          description: offering.description || undefined,
          gradeLevel: "", // Offerings 不再有 grade_level，如果需要可以从 type_config 获取
          instances: [],
        })
      }

      // 确保 instance.id 和 offering.id 不为空
      if (!instance.id || instance.id.trim() === '' || !offering.id || offering.id.trim() === '') {
        console.warn(`[Programs API] Skipping instance with empty id: instance.id=${instance.id}, offering.id=${offering.id}`)
        continue
      }

      const courseEntry = seriesEntry.courses.get(offeringId)
      if (!courseEntry) continue
      courseEntry.instances.push({
        id: instance.id,
        location_id: instance.location_id,
        start_date: instance.start_date,
        end_date: instance.end_date,
        start_time: instance.start_time,
        end_time: instance.end_time,
        max_students: instance.max_students,
        current_students: instance.current_students,
        available_spots: (instance.max_students || 0) - (instance.current_students || 0),
        is_full: (instance.current_students || 0) >= (instance.max_students || 0),
        status: instance.status,
        price_override: instance.price_override,
        location: instance.location,
        offering: {
          id: offering.id,
          name: offering.name,
          slug: offering.slug || undefined,
          description: offering.description || undefined,
          poster_url: offering.poster_url || undefined,
          offering_type: offering.offering_type,
          base_price: offering.base_price,
        },
      })
    }

    // 6. 将 Map 转为数组返回（只包含有 instances 的 programs）
    const result = Array.from(seriesMap.values())
      .map((entry) => {
        const coursesWithInstances = Array.from(entry.courses.values())
          .filter((course) => course.instances && course.instances.length > 0)
        
        return {
          id: entry.id,
          name: entry.name,
          display_name: entry.display_name,
          description: entry.description,
          start_date: entry.start_date,
          end_date: entry.end_date,
          category: entry.category,
          courses: coursesWithInstances,
        }
      })
      .filter((program) => program.courses.length > 0) // 过滤掉没有 courses 的 programs

    console.log(`[Programs API] Final result: ${result.length} programs with offerings:`, result.map((p) => ({
      program: p.display_name,
      program_id: p.id,
      course_count: p.courses.length,
      courses: p.courses.map((c) => ({
        title: c.title,
        id: c.id,
        instance_count: c.instances?.length || 0
      }))
    })))

    return NextResponse.json(result, { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching programs:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch programs" },
      { status: 500 }
    )
  }
}
