import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from("v2_resource_category")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Category not found" }, { status: 404 })
      }
      return NextResponse.json(
        { error: error.message || "Failed to fetch category" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching resource category:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch" },
      { status: 500 }
    )
  }
}

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

    if (name !== undefined && !/^[a-z0-9_]+$/.test(String(name).toLowerCase())) {
      return NextResponse.json(
        { error: "Name must contain only lowercase letters, numbers, and underscores" },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = String(name).toLowerCase().trim()
    if (display_name !== undefined) updateData.display_name = display_name
    if (description !== undefined) updateData.description = description || null
    if (display_order !== undefined) updateData.display_order = display_order
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabaseAdmin
      .from("v2_resource_category")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Category with this name already exists" }, { status: 400 })
      }
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Category not found" }, { status: 404 })
      }
      return NextResponse.json(
        { error: error.message || "Failed to update category" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: unknown) {
    console.error("Error updating resource category:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: resources, error: checkError } = await supabaseAdmin
      .from("v2_resource")
      .select("id")
      .eq("resource_category_id", id)
      .limit(1)

    if (checkError) {
      return NextResponse.json(
        { error: "Failed to check category usage" },
        { status: 500 }
      )
    }

    if (resources && resources.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with existing resources. Remove or move resources first." },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("v2_resource_category")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to delete category" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Category deleted successfully" }, { status: 200 })
  } catch (error: unknown) {
    console.error("Error deleting resource category:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete" },
      { status: 500 }
    )
  }
}
