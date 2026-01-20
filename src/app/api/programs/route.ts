import { NextResponse } from "next/server"
import { getFranchiseByCode } from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase"

// GET /api/programs?franchise=code
// 返回某个 franchise 下的所有 series/programs 以及每个 program 下的课程列表
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

    // 1. 获取该 franchise 下的所有 series/programs
    const { data: seriesData, error: seriesError } = await supabaseAdmin
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
        category:course_categories(
          id,
          name,
          display_name
        )
      `)
      .eq("is_active", true)
      .eq("franchise_id", franchise.id)
      .order("display_order", { ascending: true })

    if (seriesError) {
      throw new Error(seriesError.message)
    }

    const seriesList = seriesData || []
    console.log(`[Programs API] Found ${seriesList.length} active series for franchise ${franchise.code}:`, seriesList.map((s: any) => ({ id: s.id, name: s.name, display_name: s.display_name })))
    if (seriesList.length === 0) {
      console.log(`[Programs API] No active series found for franchise ${franchise.code}, returning empty array`)
      return NextResponse.json([], { status: 200 })
    }

    const seriesIds = seriesList.map((s: any) => s.id)
    console.log(`[Programs API] Series IDs to query assignments:`, seriesIds)

    // 2. 获取这些 series 下的 assignments + courses
    const { data: assignmentsData, error: assignmentsError } = await supabaseAdmin
      .from("course_assignments")
      .select(`
        id,
        series_id,
        course:courses(
          *
        )
      `)
      .eq("is_active", true)
      .in("series_id", seriesIds)

    if (assignmentsError) {
      throw new Error(assignmentsError.message)
    }

    console.log(`[Programs API] Found ${(assignmentsData || []).length} active assignments`)
    // 记录每个 assignment 的课程信息
    if (assignmentsData && assignmentsData.length > 0) {
      assignmentsData.forEach((row: any, index: number) => {
        const course = row.course
        console.log(`[Programs API] Assignment ${index + 1}:`, {
          assignment_id: row.id,
          series_id: row.series_id,
          course_id: course?.id,
          course_name: course?.name,
          course_status: course?.status,
          has_course: !!course
        })
      })
    }

    // 3. 先查询 instances，以便只添加有 instances 的 courses
    const assignmentIds = Array.from(new Set((assignmentsData || []).map((a: any) => a.id)))
    let instancesData: any[] = []
    
    if (assignmentIds.length > 0) {
      console.log(`[Programs API] Querying instances for ${assignmentIds.length} assignments:`, assignmentIds)
      
      // 先查询所有 instances（不过滤 status 和 franchise_id），以便调试
      const { data: allInstances, error: allInstancesError } = await supabaseAdmin
        .from("course_instances")
        .select(`
          id,
          assignment_id,
          location_id,
          start_date,
          end_date,
          start_time,
          end_time,
          max_students,
          current_students,
          status,
          price_override,
          is_active,
          franchise_id
        `)
        .in("assignment_id", assignmentIds)

      if (allInstancesError) {
        console.error(`[Programs API] Error fetching all instances:`, allInstancesError)
      } else {
        console.log(`[Programs API] Found ${allInstances?.length || 0} total instances (before filtering):`, 
          (allInstances || []).map((inst: any) => ({
            id: inst.id,
            assignment_id: inst.assignment_id,
            status: inst.status,
            is_active: inst.is_active,
            franchise_id: inst.franchise_id,
            start_date: inst.start_date
          }))
        )
      }

      // 查询 instances，通过 assignment_id 过滤（assignment 已经属于该 franchise 的 series）
      // 注意：不直接过滤 franchise_id，因为可能有些 instances 的 franchise_id 是 null
      // 但我们通过 assignment → series 的关系已经确保了它们属于该 franchise
      const { data: instances, error: instancesError } = await supabaseAdmin
        .from("course_instances")
        .select(`
          id,
          assignment_id,
          location_id,
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
          location:course_locations(
            id,
            name,
            address,
            city,
            state,
            zip_code
          )
        `)
        .in("assignment_id", assignmentIds)
        .eq("is_active", true)
        .in("status", ["scheduled", "ongoing"])
        .order("start_date", { ascending: true })
        .order("start_time", { ascending: true })

      if (instancesError) {
        console.error(`[Programs API] Error fetching instances:`, instancesError)
      } else {
        console.log(`[Programs API] Found ${instances?.length || 0} instances after filtering (is_active=true, status in [scheduled, ongoing]):`,
          (instances || []).map((inst: any) => ({
            id: inst.id,
            assignment_id: inst.assignment_id,
            status: inst.status,
            franchise_id: inst.franchise_id
          }))
        )
        
        instancesData = (instances || []).filter((inst: any) => {
          // 过滤：只保留 franchise_id 匹配或为 null 的 instances
          // 如果 franchise_id 为 null，我们通过 assignment → series 的关系已经验证了它属于该 franchise
          const matches = !inst.franchise_id || inst.franchise_id === franchise.id
          if (!matches) {
            console.log(`[Programs API] Filtering out instance ${inst.id}: franchise_id mismatch (${inst.franchise_id} !== ${franchise.id})`)
          }
          return matches
        })
        console.log(`[Programs API] Final filtered instances: ${instancesData.length} for franchise ${franchise.code}`)
      }
    }

    // 4. 将 instances 按 assignment_id 分组
    const instancesByAssignment = new Map<string, any[]>()
    for (const instance of instancesData) {
      const assignmentId = instance.assignment_id
      if (!instancesByAssignment.has(assignmentId)) {
        instancesByAssignment.set(assignmentId, [])
      }
      instancesByAssignment.get(assignmentId)!.push({
        id: instance.id,
        assignment_id: instance.assignment_id,
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
      })
    }

    // 5. 按 series 分组课程（只添加有 instances 的 courses）
    const seriesMap = new Map<string, any>()
    for (const s of seriesList as any[]) {
      seriesMap.set(s.id, {
        id: s.id,
        name: s.name,
        display_name: s.display_name,
        description: s.description,
        start_date: s.start_date,
        end_date: s.end_date,
        category: s.category
          ? {
              id: s.category.id,
              name: s.category.name,
              display_name: s.category.display_name,
            }
          : null,
        courses: new Map<string, any>(), // 临时 Map 用于去重课程
      })
    }

    let publishedCoursesCount = 0
    let skippedCoursesCount = 0
    
    for (const row of assignmentsData || []) {
      const assignment = row as any
      const seriesId = assignment.series_id
      const course = assignment.course
      
      // 确保 assignment 和 course 都存在
      if (!seriesId || !course) {
        skippedCoursesCount++
        console.log(`[Programs API] Skipping assignment ${assignment.id}: missing seriesId or course`)
        continue
      }
      
      // 只返回 published 状态的课程（公开 API 的要求）
      if (course.status !== 'published') {
        skippedCoursesCount++
        console.log(`[Programs API] Skipping course ${course.id} (${course.name}): status is "${course.status}", not "published"`)
        continue
      }

      // 只添加有 instances 的 courses
      const courseInstances = instancesByAssignment.get(assignment.id) || []
      if (courseInstances.length === 0) {
        skippedCoursesCount++
        console.log(`[Programs API] Skipping course ${course.id} (${course.name}): no instances`)
        continue
      }

      const seriesEntry = seriesMap.get(seriesId)
      if (!seriesEntry) {
        console.log(`[Programs API] Warning: Series entry not found for seriesId ${seriesId}`)
        continue
      }

      if (!seriesEntry.courses.has(course.id)) {
        publishedCoursesCount++
        seriesEntry.courses.set(course.id, {
          id: course.id,
          title: course.name,
          gradeLevel: (course as any).grade_level || (course as any).target_grades || "",
          slug: course.slug || undefined,
          poster_url: (course as any).poster_url || undefined,
          instances: courseInstances,
        })
        console.log(`[Programs API] Added course "${course.name}" (${course.id}) with ${courseInstances.length} instances to series "${seriesEntry.display_name}"`)
      } else {
        // 如果课程已存在（可能有多个 assignments），合并 instances
        const existingCourse = seriesEntry.courses.get(course.id)
        const existingInstances = existingCourse.instances || []
        // 合并并去重 instances（按 id）
        const instancesMap = new Map()
        existingInstances.forEach((inst: any) => instancesMap.set(inst.id, inst))
        courseInstances.forEach((inst: any) => instancesMap.set(inst.id, inst))
        existingCourse.instances = Array.from(instancesMap.values())
        console.log(`[Programs API] Merged instances for course "${course.name}" (${course.id}), total: ${existingCourse.instances.length}`)
      }
    }
    
    console.log(`[Programs API] Course filtering summary: ${publishedCoursesCount} published courses with instances added, ${skippedCoursesCount} courses skipped`)

    // 6. 将 Map 转为数组返回（已经过滤掉没有 instances 的 courses）
    const result = Array.from(seriesMap.values())
      .map((entry) => {
        const coursesWithInstances = Array.from(entry.courses.values())
          .filter((course: any) => course.instances && course.instances.length > 0)
        
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

    console.log(`[Programs API] Final result: ${result.length} programs with courses:`, result.map((p: any) => ({
      program: p.display_name,
      program_id: p.id,
      course_count: p.courses.length,
      courses: p.courses.map((c: any) => ({
        title: c.title,
        id: c.id,
        instance_count: c.instances?.length || 0
      }))
    })))

    // 详细日志：检查每个 program 的 courses
    result.forEach((p: any) => {
      console.log(`[Programs API] Program "${p.display_name}" (${p.id}):`, {
        courses_count: p.courses.length,
        courses: p.courses.map((c: any) => ({
          id: c.id,
          title: c.title,
          instances_count: c.instances?.length || 0,
          has_instances: !!(c.instances && c.instances.length > 0)
        }))
      })
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching programs:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch programs" },
      { status: 500 }
    )
  }
}


