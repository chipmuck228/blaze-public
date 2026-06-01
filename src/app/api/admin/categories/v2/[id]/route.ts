import { NextResponse } from "next/server"
import {getErrorMessage, type StringKeyRecord} from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取单个 category
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from("v2_category")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Category not found" }, { status: 404 })
      }
      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to fetch category" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching category:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch category" },
      { status: 500 }
    )
  }
}

// 更新 category
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      display_name,
      description,
      poster_url,
      config_base,
      display_order,
      is_active,
    } = body

    // 验证 name 格式（如果提供）
    if (name && !/^[a-z0-9_]+$/.test(name)) {
      return NextResponse.json(
        { error: "Name must contain only lowercase letters, numbers, and underscores" },
        { status: 400 }
      )
    }

    const updateData: StringKeyRecord = {}
    if (name !== undefined) updateData.name = name.toLowerCase().trim()
    if (display_name !== undefined) updateData.display_name = display_name
    if (description !== undefined) updateData.description = description || null
    if (poster_url !== undefined) updateData.poster_url = poster_url || null
    if (config_base !== undefined) updateData.config_base = config_base || {}
    if (display_order !== undefined) updateData.display_order = display_order
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabaseAdmin
      .from("v2_category")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating category:", error)
      
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Category with this name already exists" },
          { status: 400 }
        )
      }
      
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Category not found" }, { status: 404 })
      }
      
      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to update category" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: unknown) {
    console.error("Error updating category:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to update category" },
      { status: 500 }
    )
  }
}

// 删除 category（检查是否有 franchise 订阅或 program 使用）
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 检查是否有 franchise 订阅
    const { data: subscriptions, error: subscriptionError } = await supabaseAdmin
      .from("v2_franchise_category_map")
      .select("id")
      .eq("category_id", id)
      .limit(1)

    if (subscriptionError) {
      console.error("Error checking subscriptions:", subscriptionError)
      return NextResponse.json(
        { error: "Failed to check category subscriptions" },
        { status: 500 }
      )
    }

    if (subscriptions && subscriptions.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with existing franchise subscriptions. Please remove all subscriptions first." },
        { status: 400 }
      )
    }

    // 检查是否有 program 使用（通过 v2_program）
    const { data: programs, error: programError } = await supabaseAdmin
      .from("v2_program")
      .select("id")
      .eq("category_id", id)
      .limit(1)

    if (programError) {
      console.error("Error checking programs:", programError)
      return NextResponse.json(
        { error: "Failed to check category usage" },
        { status: 500 }
      )
    }

    if (programs && programs.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with existing programs. Please remove all programs first." },
        { status: 400 }
      )
    }

    // 删除 category
    const { error } = await supabaseAdmin
      .from("v2_category")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting category:", error)
      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to delete category" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Category deleted successfully" }, { status: 200 })
  } catch (error: unknown) {
    console.error("Error deleting category:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to delete category" },
      { status: 500 }
    )
  }
}
