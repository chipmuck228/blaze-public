import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import {
  parseTemplateRowForApi,
  resolveTemplateContentHtml,
} from "@/lib/newsletter-template-save"

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

    const enriched = parseTemplateRowForApi(data.name, data.content_html)

    return NextResponse.json(
      { ...data, ...enriched },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error fetching template:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch template" },
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
    const { name, subject, content_html, content_text, is_active, editor } = body

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (subject !== undefined) updateData.subject = subject

    if (editor !== undefined || content_html !== undefined) {
      const templateName =
        (typeof name === "string" ? name : undefined) ??
        (
          await supabaseAdmin
            .from("newsletter_templates")
            .select("name")
            .eq("id", id)
            .single()
        ).data?.name ??
        "Custom Template"

      try {
        updateData.content_html = resolveTemplateContentHtml({
          name: templateName,
          subject: typeof subject === "string" ? subject : "",
          content_html,
          editor,
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? getErrorMessage(err) : "Invalid template body"
        return NextResponse.json({ error: message }, { status: 400 })
      }
    }
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
  } catch (error: unknown) {
    console.error("Error updating template:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to update template" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json(
      {
        error:
          "Templates cannot be deleted because past campaigns reference them. Set the template to Inactive instead — it will be hidden from Send but kept for history.",
      },
      { status: 409 }
    )
  } catch (error: unknown) {
    const message =
      error instanceof Error ? getErrorMessage(error) : "Failed to delete template"
    console.error("Error deleting template:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
