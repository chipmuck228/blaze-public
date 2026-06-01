import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { resolveTemplateContentHtml } from "@/lib/newsletter-template-save"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from("newsletter_templates")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ templates: data || [] }, { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching templates:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch templates" },
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
    const { name, subject, content_text, is_active, editor, content_html } = body

    if (!name || !subject) {
      return NextResponse.json(
        { error: "Name and subject are required" },
        { status: 400 }
      )
    }

    let resolvedHtml: string
    try {
      resolvedHtml = resolveTemplateContentHtml({
        name,
        subject,
        content_html,
        editor,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? getErrorMessage(err) : "Invalid template body"
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("newsletter_templates")
      .insert({
        name,
        subject,
        content_html: resolvedHtml,
        content_text: content_text || null,
        is_active: is_active !== undefined ? is_active : true,
        created_by: session.user.id,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: unknown) {
    console.error("Error creating template:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to create template" },
      { status: 500 }
    )
  }
}
