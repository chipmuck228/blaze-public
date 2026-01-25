import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getCourseSeriesByCategory } from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase"
import { formatValidationError, formatOperationError, createErrorResponse } from "@/lib/errors"

// 获取所有系列（支持按 category 过滤）
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("categoryId")
    const franchiseId = searchParams.get("franchiseId")

    if (categoryId) {
      const series = await getCourseSeriesByCategory(categoryId, franchiseId || undefined)
      // 获取每个 series 的 franchise 和 category 信息
      const seriesWithDetails = await Promise.all(
        series.map(async (s) => {
          const [franchiseResult, categoryResult] = await Promise.all([
            s.franchise_id
              ? supabaseAdmin.from("franchises").select("id, code, name").eq("id", s.franchise_id).single()
              : Promise.resolve({ data: null }),
            supabaseAdmin.from("course_categories").select("id, name, display_name").eq("id", s.category_id).single(),
          ])
          return {
            ...s,
            franchise: franchiseResult.data || null,
            category: categoryResult.data || null,
          }
        })
      )
      return NextResponse.json(seriesWithDetails, { status: 200 })
    }

    // 获取所有系列（可选按 franchise 过滤）
    let query = supabaseAdmin
      .from("course_series")
      .select(`
        *,
        franchise:franchises(id, code, name),
        category:course_categories(id, name, display_name)
      `)
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (franchiseId) {
      query = query.eq("franchise_id", franchiseId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching series:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch series" },
      { status: 500 }
    )
  }
}

// 创建新系列（必须指定 category_id, franchise_id, name, display_name, start_date, end_date）
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { category_id, franchise_id, name, display_name, description, start_date, end_date, display_order } = body

    // 验证必填字段
    const missingFields: string[] = []
    if (!category_id) missingFields.push('category_id')
    if (!franchise_id) missingFields.push('franchise_id') // 新增：必须提供
    if (!name) missingFields.push('name')
    if (!display_name) missingFields.push('display_name')
    if (!start_date) missingFields.push('start_date') // 新增：必须提供
    if (!end_date) missingFields.push('end_date') // 新增：必须提供

    if (missingFields.length > 0) {
      const errorResponse = createErrorResponse(
        { missingFields },
        400,
        'zh'
      )
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // 验证日期格式和逻辑
    if (start_date && end_date) {
      const start = new Date(start_date)
      const end = new Date(end_date)
      
      if (isNaN(start.getTime())) {
        return NextResponse.json(
          { error: "开始日期格式不正确，请使用 YYYY-MM-DD 格式" },
          { status: 400 }
        )
      }
      
      if (isNaN(end.getTime())) {
      return NextResponse.json(
          { error: "结束日期格式不正确，请使用 YYYY-MM-DD 格式" },
        { status: 400 }
      )
    }
      
      if (start > end) {
        return NextResponse.json(
          { error: "开始日期不能晚于结束日期" },
          { status: 400 }
        )
      }
    }

    // 将 name 转换为小写以确保大小写不敏感的唯一性
    const normalizedName = name.toLowerCase().trim()

    const { data, error } = await supabaseAdmin
      .from("course_series")
      .insert({
        category_id,
        franchise_id, // 不再允许 NULL
        name: normalizedName, // 使用标准化的小写名称
        display_name,
        description,
        start_date,
        end_date,
        display_order: display_order || 0,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating series:", error)
      const errorResponse = createErrorResponse(error, 400, 'zh')
      // 根据错误类型返回适当的 HTTP 状态码
      const statusCode = error.code === '23505' ? 409 : 500 // 409 Conflict for unique constraint violations
      return NextResponse.json(errorResponse, { status: statusCode })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error("Error creating series:", error)
    const errorResponse = createErrorResponse(error, 500, 'zh')
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

