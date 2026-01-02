import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

// GET /api/public/instances?category=xxx
// 返回所有可用的 instances，按 franchise -> series -> instances 组织
// 即使没有 instances，也返回 franchise 和 programs 信息
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("category")

    // 使用更直接的方式：通过 series 的 franchise_id 来组织数据
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
        ),
        franchise:franchises!inner(
          id,
          code,
          name
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

    // 3. 获取这些 series 下的所有 assignments
    const { data: assignmentsData, error: assignmentsError } = await supabaseAdmin
      .from("course_assignments")
      .select(`
        id,
        series_id,
        course:courses(
          id,
          name,
          slug,
          description,
          target_grades,
          target_age_min,
          target_age_max,
          base_price,
          status
        ),
        category:course_categories(
          id,
          name,
          display_name
        )
      `)
      .eq("is_active", true)
      .in("series_id", seriesIds)

    if (assignmentsError) {
      throw new Error(assignmentsError.message)
    }

    console.log(`[Public Instances API] Found ${assignmentsData?.length || 0} active assignments`)

    // 只保留已发布课程的 assignments
    const publishedAssignments = (assignmentsData || []).filter((a: any) => {
      // Supabase 嵌套查询可能返回数组或对象
      const course = Array.isArray(a.course) ? a.course[0] : a.course
      return course?.status === "published"
    })

    const assignmentIds = publishedAssignments.map((a: any) => a.id)
    console.log(`[Public Instances API] Published assignment IDs:`, assignmentIds)

    // 4. 获取这些 assignments 下的所有活跃 instances
    let instancesQuery = supabaseAdmin
      .from("course_instances")
      .select(`
        id,
        start_date,
        end_date,
        start_time,
        end_time,
        max_students,
        current_students,
        status,
        price_override,
        assignment_id,
        location:course_locations(
          id,
          name,
          address,
          city,
          state
        )
      `)
      .eq("is_active", true)
      .in("status", ["scheduled", "ongoing"])

    if (assignmentIds.length > 0) {
      instancesQuery = instancesQuery.in("assignment_id", assignmentIds)
    } else {
      // 如果没有 published assignments，返回空 instances
      instancesQuery = instancesQuery.eq("assignment_id", "00000000-0000-0000-0000-000000000000") // 不存在的 ID，确保返回空
    }

    instancesQuery = instancesQuery
      .order("start_date", { ascending: true })
      .order("start_time", { ascending: true })

    const { data: instancesData, error: instancesError } = await instancesQuery

    if (instancesError) {
      throw new Error(instancesError.message)
    }

    console.log(`[Public Instances API] Found ${instancesData?.length || 0} active instances`)

    const instances = instancesData || []

    // 按 franchise -> series -> instances 组织数据
    const franchiseMap = new Map<string, any>()

    // 创建 assignment 到 series 的映射
    const assignmentToSeriesMap = new Map<string, any>()
    for (const assignment of publishedAssignments) {
      assignmentToSeriesMap.set(assignment.id, assignment.series_id)
    }

    // 创建 series 到 franchise 的映射
    const seriesToFranchiseMap = new Map<string, any>()
    for (const series of seriesData) {
      // Supabase 嵌套查询可能返回数组或对象，需要处理两种情况
      const franchise = Array.isArray(series.franchise) ? series.franchise[0] : series.franchise
      if (franchise) {
        seriesToFranchiseMap.set(series.id, franchise)
      }
    }

    // 1. 先添加所有 series/programs（即使没有 instances）
    for (const series of seriesData) {
      // Supabase 嵌套查询可能返回数组或对象
      const franchise = Array.isArray(series.franchise) ? series.franchise[0] : series.franchise
      const category = Array.isArray(series.category) ? series.category[0] : series.category
      
      if (!franchise) continue

      const franchiseId = franchise.id
      const seriesId = series.id

      // 初始化 franchise
      if (!franchiseMap.has(franchiseId)) {
        franchiseMap.set(franchiseId, {
          id: franchise.id,
          code: franchise.code,
          name: franchise.name,
          programs: new Map(),
        })
      }

      const franchiseData = franchiseMap.get(franchiseId)!

      // 添加 series/program（即使没有 instances）
      if (!franchiseData.programs.has(seriesId)) {
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
    }

    // 2. 然后添加 instances
    for (const instance of instances) {
      const assignmentId = instance.assignment_id
      if (!assignmentId) continue

      // 通过 assignment_id 找到对应的 series_id
      const seriesId = assignmentToSeriesMap.get(assignmentId)
      if (!seriesId) continue

      // 通过 series_id 找到对应的 franchise
      const franchise = seriesToFranchiseMap.get(seriesId)
      if (!franchise) continue

      const franchiseId = franchise.id

      // 找到对应的 assignment 和 course
      const assignment = publishedAssignments.find((a: any) => a.id === assignmentId)
      if (!assignment) continue

      // Supabase 嵌套查询可能返回数组或对象
      const course = Array.isArray(assignment.course) ? assignment.course[0] : assignment.course
      if (!course) continue

      // 确保 franchise 和 series 在 map 中
      if (!franchiseMap.has(franchiseId)) {
        franchiseMap.set(franchiseId, {
          id: franchise.id,
          code: franchise.code,
          name: franchise.name,
          programs: new Map(),
        })
      }

      const franchiseData = franchiseMap.get(franchiseId)!

      if (!franchiseData.programs.has(seriesId)) {
        // 如果 series 不在 map 中，从 seriesData 中查找
        const series = seriesData.find((s: any) => s.id === seriesId)
        if (series) {
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
      }

      const targetSeries = franchiseData.programs.get(seriesId)
      if (!targetSeries) continue

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
          id: course.id,
          name: course.name,
          slug: course.slug,
          description: course.description,
          grade_level: Array.isArray(course.target_grades) ? course.target_grades[0] : course.target_grades || null,
          target_grades: Array.isArray(course.target_grades) ? course.target_grades : (course.target_grades ? [course.target_grades] : null),
          age_min: course.target_age_min || null,
          age_max: course.target_age_max || null,
          base_price: course.base_price,
        },
        available_spots: Math.max(0, (instance.max_students || 0) - instance.current_students),
        is_full: (instance.max_students || 0) <= instance.current_students,
      })
    }

    // 转换为数组格式，只返回有 programs 的 franchises
    const result = Array.from(franchiseMap.values())
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

