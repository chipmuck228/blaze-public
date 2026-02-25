import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取 franchise 订阅的所有 categories（包含订阅信息）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: franchiseId } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 获取 franchise 订阅的所有 categories，包含订阅信息
    const { data, error } = await supabaseAdmin
      .from("v2_franchise_category_map")
      .select(`
        id,
        franchise_id,
        category_id,
        is_visible,
        display_order,
        created_at,
        updated_at,
        category:v2_category(
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
      `)
      .eq("franchise_id", franchiseId)
      .order("display_order", { ascending: true })

    if (error) {
      console.error("Error fetching franchise categories:", error)
      return NextResponse.json(
        { error: error.message || "Failed to fetch franchise categories" },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [], { status: 200 })
  } catch (error: any) {
    console.error("Error fetching franchise categories:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch franchise categories" },
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

    // 检查 franchise 是否存在
    const { data: franchise, error: franchiseError } = await supabaseAdmin
      .from("v2_franchise")
      .select("id")
      .eq("id", franchiseId)
      .single()

    if (franchiseError || !franchise) {
      return NextResponse.json(
        { error: "Franchise not found" },
        { status: 404 }
      )
    }

    // 检查 category 是否存在
    const { data: category, error: categoryError } = await supabaseAdmin
      .from("v2_category")
      .select("id")
      .eq("id", category_id)
      .single()

    if (categoryError || !category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      )
    }

    // 检查是否已经订阅
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("v2_franchise_category_map")
      .select("id")
      .eq("franchise_id", franchiseId)
      .eq("category_id", category_id)
      .single()

    if (existing && !existingError) {
      return NextResponse.json(
        { error: "Franchise already subscribed to this category" },
        { status: 400 }
      )
    }

    // 创建订阅关系
    const { data, error } = await supabaseAdmin
      .from("v2_franchise_category_map")
      .insert({
        franchise_id: franchiseId,
        category_id,
        is_visible: is_visible !== undefined ? is_visible : true,
        display_order: display_order || 0,
      })
      .select(`
        *,
        category:v2_category(*)
      `)
      .single()

    if (error) {
      console.error("Error creating subscription:", error)
      
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Franchise already subscribed to this category" },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: error.message || "Failed to create subscription" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error("Error creating subscription:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create subscription" },
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
    const { subscriptions } = body // Array of { category_id, is_visible, display_order }

    if (!Array.isArray(subscriptions)) {
      return NextResponse.json(
        { error: "Invalid request body: subscriptions must be an array" },
        { status: 400 }
      )
    }

    // 使用事务更新所有订阅
    const updates = subscriptions.map(async (sub: any) => {
      const { category_id, is_visible, display_order } = sub
      
      if (!category_id) {
        throw new Error("Missing category_id in subscription")
      }

      // 使用 upsert 更新或创建订阅
      const { data, error } = await supabaseAdmin
        .from("v2_franchise_category_map")
        .upsert({
          franchise_id: franchiseId,
          category_id,
          is_visible: is_visible !== undefined ? is_visible : true,
          display_order: display_order || 0,
        }, {
          onConflict: "franchise_id,category_id"
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      return data
    })

    const results = await Promise.all(updates)

    return NextResponse.json({ subscriptions: results }, { status: 200 })
  } catch (error: any) {
    console.error("Error updating subscriptions:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update subscriptions" },
      { status: 500 }
    )
  }
}
