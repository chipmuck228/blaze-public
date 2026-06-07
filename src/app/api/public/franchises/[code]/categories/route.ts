import { NextResponse } from "next/server"
import {getErrorMessage, type StringKeyRecord} from "@/lib/typed-error"
import { supabaseAdmin } from "@/lib/supabase"
import { unwrapRelation } from "@/lib/supabase-relation"
import { catalogTables, catalogCols } from "@/lib/catalog-db"

/**
 * 获取指定 franchise 订阅的 categories（公开 API）
 * 只返回 is_visible = true 的 categories
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const normalizedCode = decodeURIComponent(code).toLowerCase()

    // 获取 franchise（从 v2_franchise 表）
    const { data: franchise, error: franchiseError } = await supabaseAdmin
      .from(catalogTables.campus)
      .select("id, code, name, is_active")
      .eq("code", normalizedCode)
      .eq("is_active", true)
      .single()

    if (franchiseError || !franchise) {
      console.error("Error fetching franchise:", franchiseError)
      return NextResponse.json(
        { error: "Franchise not found" },
        { status: 404 }
      )
    }

    // 先检查是否有任何订阅记录（不限制 is_visible）
    const mapCampusFk = catalogCols.campusStageMap.campusId
    const mapStageFk = catalogCols.campusStageMap.stageId

    const { data: allMaps, error: allMapsError } = await supabaseAdmin
      .from(catalogTables.campusStageMap)
      .select(`id, ${mapCampusFk}, ${mapStageFk}, is_visible, display_order`)
      .eq(mapCampusFk, franchise.id)

    console.log(`[${catalogTables.campusStageMap}] Step 1 - All maps:`, {
      franchiseCode: normalizedCode,
      franchiseId: franchise.id,
      allMapsCount: allMaps?.length || 0,
      allMaps: allMaps,
      error: allMapsError,
    })

    // 如果没有订阅记录，返回空数组（不显示任何 category）
    if (!allMaps || allMaps.length === 0) {
      console.log(`[${catalogTables.campusStageMap}] No subscriptions found, returning empty array`)
      return NextResponse.json({ categories: [] }, { status: 200 })
    }

    // 获取 franchise 订阅的 categories（只返回 is_visible = true 的）
    // 使用 inner join 确保只返回存在的 category
    const { data, error } = await supabaseAdmin
      .from(catalogTables.campusStageMap)
      .select(`
        id,
        ${mapCampusFk},
        ${mapStageFk},
        is_visible,
        display_order,
        category:${catalogTables.stage}!inner(
          id,
          name,
          display_name,
          description,
          poster_url,
          link,
          is_active,
          display_order
        )
      `)
      .eq(mapCampusFk, franchise.id)
      .eq("is_visible", true)
      .order("display_order", { ascending: true })

    console.log(`[${catalogTables.campusStageMap}] Step 2 - Query result:`, {
      franchiseCode: normalizedCode,
      franchiseId: franchise.id,
      dataCount: data?.length || 0,
      data: data,
      error: error,
    })

    if (error) {
      console.error("Error fetching franchise categories:", error)
      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to fetch franchise categories" },
        { status: 500 }
      )
    }

    // 过滤出激活的 categories，并提取 category 信息
    const categories = (data || [])
      .map((item) => unwrapRelation(item?.category))
      .filter((cat): cat is NonNullable<typeof cat> => !!cat && cat.is_active === true)
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        display_name: cat.display_name,
        description: cat.description,
        poster_url: cat.poster_url,
        link: cat.link,
        is_active: cat.is_active,
        display_order: cat.display_order,
      }))

    // 添加调试日志（始终输出）
    console.log(`[${catalogTables.campusStageMap}] Final result:`, {
      franchiseCode: normalizedCode,
      franchiseId: franchise.id,
      rawDataCount: data?.length || 0,
      rawDataSample: data?.slice(0, 2),
      categoriesCount: categories.length,
      categories: categories.map((c) => ({ id: c.id, name: c.name, display_name: c.display_name })),
    })

    return NextResponse.json({ categories }, { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching franchise categories:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch franchise categories" },
      { status: 500 }
    )
  }
}
