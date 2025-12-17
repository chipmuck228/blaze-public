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
    if (seriesList.length === 0) {
      return NextResponse.json([], { status: 200 })
    }

    const seriesIds = seriesList.map((s: any) => s.id)

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

    for (const row of assignmentsData || []) {
      const assignment = row as any
      const seriesId = assignment.series_id
      const course = assignment.course
      if (!seriesId || !course) continue

      const seriesEntry = seriesMap.get(seriesId)
      if (!seriesEntry) continue

      if (!seriesEntry.courses.has(course.id)) {
        seriesEntry.courses.set(course.id, {
          id: course.id,
          title: course.name,
          gradeLevel: (course as any).grade_level || "",
          slug: course.slug || undefined,
        })
      }
    }

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

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching programs:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch programs" },
      { status: 500 }
    )
  }
}


