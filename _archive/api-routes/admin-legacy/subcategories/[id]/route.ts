import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取单个子类标签
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
      .from("course_subcategories")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      return NextResponse.json({ error: "Subcategory not found" }, { status: 404 })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching subcategory:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch subcategory" },
      { status: 500 }
    )
  }
}

// 更新子类标签
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
    const { name, display_name, description, display_order, is_active } = body

    const { data, error } = await supabaseAdmin
      .from("course_subcategories")
      .update({
        name,
        display_name,
        description,
        display_order,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error updating subcategory:", error)
      return NextResponse.json(
        { error: error.message || "Failed to update subcategory" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error updating subcategory:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update subcategory" },
      { status: 500 }
    )
  }
}

// 删除子类标签
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

    const { error } = await supabaseAdmin
      .from("course_subcategories")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting subcategory:", error)
      return NextResponse.json(
        { error: error.message || "Failed to delete subcategory" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Subcategory deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting subcategory:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete subcategory" },
      { status: 500 }
    )
  }
}

