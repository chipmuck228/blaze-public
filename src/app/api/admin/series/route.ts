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
      
      // 获取所有 franchises_v2 用于映射
      const { data: franchisesV2Data } = await supabaseAdmin
        .from("franchises_v2")
        .select("id, code, name, legacy_franchise_id")
        .eq("is_active", true)
      
      const franchiseIdMap = new Map<string, any>()
      if (franchisesV2Data) {
        for (const fv2 of franchisesV2Data) {
          franchiseIdMap.set(fv2.id, fv2)
          if (fv2.legacy_franchise_id) {
            franchiseIdMap.set(fv2.legacy_franchise_id, fv2)
          }
        }
      }
      
      // 获取每个 series 的 franchise 和 category 信息
      const seriesWithDetails = await Promise.all(
        series.map(async (s) => {
          let franchise = null
          if (s.franchise_id) {
            // 查找匹配的 franchises_v2（直接匹配或通过 legacy_franchise_id）
            const mappedFranchise = franchiseIdMap.get(s.franchise_id)
            if (mappedFranchise) {
              franchise = {
                id: mappedFranchise.id,
                code: mappedFranchise.code,
                name: mappedFranchise.name,
              }
            }
          }
          
          const categoryResult = await supabaseAdmin
            .from("course_categories")
            .select("id, name, display_name")
            .eq("id", s.category_id)
            .single()
          
          return {
            ...s,
            franchise,
            category: categoryResult.data || null,
          }
        })
      )
      return NextResponse.json(seriesWithDetails, { status: 200 })
    }

    // 获取所有系列（可选按 franchise 过滤）
    // 注意：franchise 信息需要手动映射到 franchises_v2
    let query = supabaseAdmin
      .from("course_series")
      .select(`
        *,
        category:course_categories(id, name, display_name)
      `)
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (franchiseId) {
      // 如果提供了 franchiseId，需要处理可能是旧表 ID 的情况
      // 先尝试直接匹配，如果找不到，尝试通过 legacy_franchise_id 匹配
      const { data: franchiseV2Data } = await supabaseAdmin
        .from("franchises_v2")
        .select("id, legacy_franchise_id")
        .or(`id.eq.${franchiseId},legacy_franchise_id.eq.${franchiseId}`)
        .eq("is_active", true)
        .limit(1)
      
      if (franchiseV2Data && franchiseV2Data.length > 0) {
        // 使用 franchises_v2.id 进行过滤
        query = query.eq("franchise_id", franchiseV2Data[0].id)
      } else {
        // 如果找不到映射，仍然使用原 franchiseId（可能是新表的 ID）
        query = query.eq("franchise_id", franchiseId)
      }
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    // 获取所有 franchises_v2 用于映射
    const { data: franchisesV2Data } = await supabaseAdmin
      .from("franchises_v2")
      .select("id, code, name, legacy_franchise_id")
      .eq("is_active", true)
    
    const franchiseIdMap = new Map<string, any>()
    if (franchisesV2Data) {
      for (const fv2 of franchisesV2Data) {
        franchiseIdMap.set(fv2.id, fv2)
        if (fv2.legacy_franchise_id) {
          franchiseIdMap.set(fv2.legacy_franchise_id, fv2)
        }
      }
    }

    // 为每个 series 映射 franchise 信息到 franchises_v2
    const seriesWithMappedFranchises = (data || []).map((series: any) => {
      let franchise = null
      if (series.franchise_id) {
        // 查找匹配的 franchises_v2（直接匹配或通过 legacy_franchise_id）
        const mappedFranchise = franchiseIdMap.get(series.franchise_id)
        if (mappedFranchise) {
          franchise = {
            id: mappedFranchise.id,
            code: mappedFranchise.code,
            name: mappedFranchise.name,
          }
        }
      }
      return {
        ...series,
        franchise,
      }
    })

    return NextResponse.json(seriesWithMappedFranchises, { status: 200 })
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

    // 验证 category_id 是否存在
    const { data: categoryCheck, error: categoryCheckError } = await supabaseAdmin
      .from("course_categories")
      .select("id, name, display_name")
      .eq("id", category_id)
      .single()

    if (categoryCheckError || !categoryCheck) {
      return NextResponse.json(
        { error: `分类不存在：category_id="${category_id}"。请确保该分类存在于数据库中，或者先创建该分类。` },
        { status: 400 }
      )
    }

    // 验证 franchise_id 是否存在（直接使用 franchises_v2 表）
    if (franchise_id) {
      const { data: franchiseCheck, error: franchiseCheckError } = await supabaseAdmin
        .from("franchises_v2")
        .select("id, code, name")
        .eq("id", franchise_id)
        .eq("is_active", true)
        .single()

      if (franchiseCheckError || !franchiseCheck) {
        return NextResponse.json(
          { error: `Franchise 不存在：franchise_id="${franchise_id}"。请确保该 franchise 存在于 franchises_v2 表中且处于激活状态。` },
          { status: 400 }
        )
      }
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
        franchise_id, // 直接使用 franchises_v2 的 ID
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

