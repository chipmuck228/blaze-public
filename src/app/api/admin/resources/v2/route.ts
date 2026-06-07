import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { catalogTables } from "@/lib/catalog-db"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("category_id")
    const includeInactive = searchParams.get("includeInactive") === "true"

    let query = supabaseAdmin
      .from(catalogTables.resource)
      .select("*, resource_category:v2_resource_category(id, name, display_name)")
      .order("display_order", { ascending: true })
      .order("title", { ascending: true })

    if (categoryId) {
      query = query.eq("resource_category_id", categoryId)
    }
    if (!includeInactive) {
      query = query.eq("is_active", true)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching resources:", error)
      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to fetch resources" },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [], { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching resources:", error)
    return NextResponse.json(
      { error: error instanceof Error ? getErrorMessage(error) : "Failed to fetch" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
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

    if (!resource_category_id || !title) {
      return NextResponse.json(
        { error: "Missing required fields: resource_category_id, title" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from(catalogTables.resource)
      .insert({
        resource_category_id,
        title,
        description: description || null,
        icon: icon || null,
        icon_color: icon_color || null,
        document_url: document_url || null,
        document_label: document_label || null,
        open_in_new_tab: open_in_new_tab !== undefined ? open_in_new_tab : true,
        display_order: display_order ?? 0,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "A resource with this title already exists in this category" },
          { status: 400 }
        )
      }
      if (error.code === "23503") {
        return NextResponse.json({ error: "Invalid resource_category_id" }, { status: 400 })
      }
      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to create resource" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: unknown) {
    console.error("Error creating resource:", error)
    return NextResponse.json(
      { error: error instanceof Error ? getErrorMessage(error) : "Failed to create" },
      { status: 500 }
    )
  }
}
