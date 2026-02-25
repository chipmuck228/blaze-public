import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 更新单个订阅关系
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; categoryId: string }> }
) {
  try {
    const { id: franchiseId, categoryId } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { is_visible, display_order } = body

    const updateData: any = {}
    if (is_visible !== undefined) updateData.is_visible = is_visible
    if (display_order !== undefined) updateData.display_order = display_order

    const { data, error } = await supabaseAdmin
      .from("v2_franchise_category_map")
      .update(updateData)
      .eq("franchise_id", franchiseId)
      .eq("category_id", categoryId)
      .select(`
        *,
        category:v2_category(*)
      `)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Subscription not found" },
          { status: 404 }
        )
      }
      
      console.error("Error updating subscription:", error)
      return NextResponse.json(
        { error: error.message || "Failed to update subscription" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error updating subscription:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update subscription" },
      { status: 500 }
    )
  }
}

// 取消订阅（删除订阅关系）
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; categoryId: string }> }
) {
  try {
    const { id: franchiseId, categoryId } = await params
    
    // 验证参数
    if (!franchiseId || franchiseId === "undefined") {
      return NextResponse.json(
        { error: "Invalid franchise ID" },
        { status: 400 }
      )
    }
    
    if (!categoryId || categoryId === "undefined") {
      return NextResponse.json(
        { error: "Invalid category ID" },
        { status: 400 }
      )
    }
    
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 检查是否有 program 使用此 category
    const { data: programs, error: programError } = await supabaseAdmin
      .from("v2_program")
      .select("id")
      .eq("franchise_id", franchiseId)
      .eq("category_id", categoryId)
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
        { error: "Cannot unsubscribe from category with existing programs. Please remove all programs first." },
        { status: 400 }
      )
    }

    // 删除订阅关系
    const { error } = await supabaseAdmin
      .from("v2_franchise_category_map")
      .delete()
      .eq("franchise_id", franchiseId)
      .eq("category_id", categoryId)

    if (error) {
      console.error("Error deleting subscription:", error)
      return NextResponse.json(
        { error: error.message || "Failed to delete subscription" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Subscription deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting subscription:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete subscription" },
      { status: 500 }
    )
  }
}
