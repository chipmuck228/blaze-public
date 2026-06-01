import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
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
      .from("v2_resource")
      .select("*, resource_category:v2_resource_category(id, name, display_name)")
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Resource not found" }, { status: 404 })
      }
      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to fetch resource" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching resource:", error)
    return NextResponse.json(
      { error: error instanceof Error ? getErrorMessage(error) : "Failed to fetch" },
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
    const {
      resource_category_id,
      title,
      description,
      icon,
      icon_color,
      document_url,
      document_label,
      open_in_new_tab,
      display_order,
      is_active,
    } = body

    const updateData: Record<string, unknown> = {}
    if (resource_category_id !== undefined) updateData.resource_category_id = resource_category_id
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description || null
    if (icon !== undefined) updateData.icon = icon || null
    if (icon_color !== undefined) updateData.icon_color = icon_color || null
    if (document_url !== undefined) updateData.document_url = document_url || null
    if (document_label !== undefined) updateData.document_label = document_label || null
    if (open_in_new_tab !== undefined) updateData.open_in_new_tab = open_in_new_tab
    if (display_order !== undefined) updateData.display_order = display_order
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabaseAdmin
      .from("v2_resource")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A resource with this title already exists in this category" },
          { status: 400 }
        )
      }
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Resource not found" }, { status: 404 })
      }
      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to update resource" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: unknown) {
    console.error("Error updating resource:", error)
    return NextResponse.json(
      { error: error instanceof Error ? getErrorMessage(error) : "Failed to update" },
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

    const { error } = await supabaseAdmin
      .from("v2_resource")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to delete resource" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Resource deleted successfully" }, { status: 200 })
  } catch (error: unknown) {
    console.error("Error deleting resource:", error)
    return NextResponse.json(
      { error: error instanceof Error ? getErrorMessage(error) : "Failed to delete" },
      { status: 500 }
    )
  }
}
