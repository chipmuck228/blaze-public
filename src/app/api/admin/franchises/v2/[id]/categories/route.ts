import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import {
  campusStageMapConflictKey,
  campusStageMapWriteRow,
  catalogTables,
  catalogCols,
  normalizeCampusStageMapRow,
} from "@/lib/catalog-db"

const mapCampusFk = () => catalogCols.campusStageMap.campusId
const mapStageFk = () => catalogCols.campusStageMap.stageId

function mapSelectFields(): string {
  return `
    id,
    ${mapCampusFk()},
    ${mapStageFk()},
    is_visible,
    display_order,
    created_at,
    updated_at,
    category:${catalogTables.stage}(
      id,
      name,
      display_name,
      description,
      poster_url,
      config_base,
      display_order,
      is_active,
      created_at,
      updated_at
    )
  `
}

// 获取 franchise 订阅的所有 categories（包含订阅信息）
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: franchiseId } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from(catalogTables.campusStageMap)
      .select(mapSelectFields())
      .eq(mapCampusFk(), franchiseId)
      .order("display_order", { ascending: true })

    if (error) {
      console.error(`[${catalogTables.campusStageMap}] Error fetching franchise categories:`, error)
      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to fetch franchise categories" },
        { status: 500 }
      )
    }

    const rows = (data || []).map((row) => normalizeCampusStageMapRow(row))
    return NextResponse.json(rows, { status: 200 })
  } catch (error: unknown) {
    console.error(`[${catalogTables.campusStageMap}] Error fetching franchise categories:`, error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch franchise categories" },
      { status: 500 }
    )
  }
}

// 为 franchise 订阅 category（创建订阅关系）
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: franchiseId } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { category_id, is_visible, display_order } = body

    if (!category_id) {
      return NextResponse.json(
        { error: "Missing required field: category_id" },
        { status: 400 }
      )
    }

    const { data: franchise, error: franchiseError } = await supabaseAdmin
      .from(catalogTables.campus)
      .select("id")
      .eq("id", franchiseId)
      .single()

    if (franchiseError || !franchise) {
      return NextResponse.json({ error: "Franchise not found" }, { status: 404 })
    }

    const { data: category, error: categoryError } = await supabaseAdmin
      .from(catalogTables.stage)
      .select("id")
      .eq("id", category_id)
      .single()

    if (categoryError || !category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from(catalogTables.campusStageMap)
      .select("id")
      .eq(mapCampusFk(), franchiseId)
      .eq(mapStageFk(), category_id)
      .single()

    if (existing && !existingError) {
      return NextResponse.json(
        { error: "Franchise already subscribed to this category" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from(catalogTables.campusStageMap)
      .insert(
        campusStageMapWriteRow(franchiseId, category_id, {
          is_visible,
          display_order,
        })
      )
      .select(`
        *,
        category:${catalogTables.stage}(*)
      `)
      .single()

    if (error) {
      console.error(`[${catalogTables.campusStageMap}] Error creating subscription:`, error)

      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Franchise already subscribed to this category" },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to create subscription" },
        { status: 500 }
      )
    }

    return NextResponse.json(normalizeCampusStageMapRow(data), {
      status: 201,
    })
  } catch (error: unknown) {
    console.error(`[${catalogTables.campusStageMap}] Error creating subscription:`, error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to create subscription" },
      { status: 500 }
    )
  }
}

// 批量更新 franchise 的 category 订阅
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: franchiseId } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { subscriptions } = body

    if (!Array.isArray(subscriptions)) {
      return NextResponse.json(
        { error: "Invalid request body: subscriptions must be an array" },
        { status: 400 }
      )
    }

    const updates = subscriptions.map(async (sub: Record<string, unknown>) => {
      const { category_id, is_visible, display_order } = sub

      if (!category_id || typeof category_id !== "string") {
        throw new Error("Missing category_id in subscription")
      }

      const { data, error } = await supabaseAdmin
        .from(catalogTables.campusStageMap)
        .upsert(campusStageMapWriteRow(franchiseId, category_id, { is_visible: is_visible as boolean | undefined, display_order: display_order as number | undefined }), {
          onConflict: campusStageMapConflictKey(),
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return normalizeCampusStageMapRow(data)
    })

    const results = await Promise.all(updates)

    return NextResponse.json({ subscriptions: results }, { status: 200 })
  } catch (error: unknown) {
    console.error(`[${catalogTables.campusStageMap}] Error updating subscriptions:`, error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to update subscriptions" },
      { status: 500 }
    )
  }
}
