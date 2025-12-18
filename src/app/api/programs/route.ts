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

    // 3. 按 series 分组课程（去重）
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
      // 如果课程没有 status 字段，默认不显示（安全起见）
      if (course.status !== 'published') {
        skippedCoursesCount++
        console.log(`[Programs API] Skipping course ${course.id} (${course.name}): status is "${course.status}", not "published"`)
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
        })
        console.log(`[Programs API] Added course "${course.name}" (${course.id}) to series "${seriesEntry.display_name}"`)
      }
    }
    
    console.log(`[Programs API] Course filtering summary: ${publishedCoursesCount} published courses added, ${skippedCoursesCount} courses skipped`)

    // 4. 将 Map 转为数组返回
    const result = Array.from(seriesMap.values()).map((entry) => ({
      id: entry.id,
      name: entry.name,
      display_name: entry.display_name,
      description: entry.description,
      start_date: entry.start_date,
      end_date: entry.end_date,
      category: entry.category,
      courses: Array.from(entry.courses.values()),
    }))

    console.log(`[Programs API] Final result: ${result.length} programs with courses:`, result.map((p: any) => ({
      program: p.display_name,
      course_count: p.courses.length,
      courses: p.courses.map((c: any) => c.title)
    })))

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching programs:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch programs" },
      { status: 500 }
    )
  }
}


