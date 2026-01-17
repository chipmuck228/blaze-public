import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

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
      .from("newsletter_templates")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Template not found" }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching template:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch template" },
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
    const { name, subject, content_html, content_text, is_active } = body

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (subject !== undefined) updateData.subject = subject
    if (content_html !== undefined) updateData.content_html = content_html
    if (content_text !== undefined) updateData.content_text = content_text
    if (is_active !== undefined) updateData.is_active = is_active

    const { data, error } = await supabaseAdmin
      .from("newsletter_templates")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error updating template:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update template" },
      { status: 500 }
    )
  }
}

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
      .from("newsletter_templates")
      .delete()
      .eq("id", id)

    if (error) {
      throw error
    }

    return NextResponse.json(
      { success: true, message: "Template deleted successfully" },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error deleting template:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete template" },
      { status: 500 }
    )
  }
}
