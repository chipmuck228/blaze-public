import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有 offerings assignments
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const seriesId = searchParams.get("seriesId")
    const categoryId = searchParams.get("categoryId")
    const offeringId = searchParams.get("offeringId")

    let query = supabaseAdmin
      .from("offerings_assignments")
      .select(`
        *,
        offering:offerings(
          id,
          name,
          slug,
          target_grades,
          offering_type,
          status
        ),
        category:course_categories(
          id,
          name,
          display_name
        ),
        series:course_series(
          id,
          name,
          display_name,
          category_id,
          franchise_id,
          start_date,
          end_date,
          franchise:franchises(
            id,
            code,
            name
          ),
          category:course_categories(
            id,
            name,
            display_name
          )
        ),
        location:course_locations(
          id,
          name
        )
      `)
      .order("created_at", { ascending: false })

    // 如果提供了 seriesId，进行过滤
    if (seriesId) {
      query = query.eq("series_id", seriesId)
    }

    // 如果提供了 categoryId，进行过滤
    if (categoryId) {
      query = query.eq("category_id", categoryId)
    }

    // 如果提供了 offeringId，进行过滤
    if (offeringId) {
      query = query.eq("offering_id", offeringId)
    }

    const { data: assignments, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    // 转换数据格式，处理嵌套查询结果
    const formattedAssignments = (assignments || []).map((assignment: any) => {
      const offering = Array.isArray(assignment.offering) ? assignment.offering[0] : assignment.offering
      const category = Array.isArray(assignment.category) ? assignment.category[0] : assignment.category
      const series = Array.isArray(assignment.series) ? assignment.series[0] : assignment.series
      const location = Array.isArray(assignment.location) ? assignment.location[0] : assignment.location
      const franchise = series?.franchise ? (Array.isArray(series.franchise) ? series.franchise[0] : series.franchise) : null
      const seriesCategory = series?.category ? (Array.isArray(series.category) ? series.category[0] : series.category) : null

      return {
        ...assignment,
        offering,
        category,
        series: {
          ...series,
          franchise,
          category: seriesCategory,
        },
        location,
      }
    })

    return NextResponse.json(formattedAssignments, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching offerings assignments:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch offerings assignments" },
      { status: 500 }
    )
  }
}

// 创建新 offerings assignment
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      offering_id,
      category_id,
      series_id,
      location_id,
      display_order,
      is_active,
      assignment_config,
    } = body

    if (!offering_id || !category_id || !series_id) {
      return NextResponse.json(
        { error: "Missing required fields: offering_id, category_id, series_id" },
        { status: 400 }
      )
    }

    // 验证 offering 是否存在且状态为 published
    const { data: offering, error: offeringError } = await supabaseAdmin
      .from("offerings")
      .select("id, status")
      .eq("id", offering_id)
      .single()

    if (offeringError || !offering) {
      return NextResponse.json(
        { error: "Offering not found" },
        { status: 404 }
      )
    }

    if (offering.status !== 'published') {
      return NextResponse.json(
        { error: "Only published offerings can be assigned" },
        { status: 400 }
      )
    }

    // 创建 assignment
    const { data: assignment, error: createError } = await supabaseAdmin
      .from("offerings_assignments")
      .insert({
        offering_id,
        category_id,
        series_id,
        location_id: location_id || null,
        display_order: display_order || 0,
        is_active: is_active !== undefined ? is_active : true,
        assignment_config: assignment_config || {},
      })
      .select(`
        *,
        offering:offerings(
          id,
          name,
          slug,
          target_grades,
          offering_type,
          status
        ),
        category:course_categories(
          id,
          name,
          display_name
        ),
        series:course_series(
          id,
          name,
          display_name
        ),
        location:course_locations(
          id,
          name
        )
      `)
      .single()

    if (createError) {
      throw new Error(createError.message)
    }

    // 转换数据格式
    const formattedAssignment = {
      ...assignment,
      offering: Array.isArray(assignment.offering) ? assignment.offering[0] : assignment.offering,
      category: Array.isArray(assignment.category) ? assignment.category[0] : assignment.category,
      series: Array.isArray(assignment.series) ? assignment.series[0] : assignment.series,
      location: Array.isArray(assignment.location) ? assignment.location[0] : assignment.location,
    }

    return NextResponse.json(formattedAssignment, { status: 201 })
  } catch (error: any) {
    console.error("Error creating offerings assignment:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create offerings assignment" },
      { status: 500 }
    )
  }
}

