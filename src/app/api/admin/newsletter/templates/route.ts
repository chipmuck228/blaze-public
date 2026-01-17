import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

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
  } catch (error: any) {
    console.error("Error fetching templates:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch templates" },
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
    const { name, subject, content_html, content_text, is_active } = body

    if (!name || !subject || !content_html) {
      return NextResponse.json(
        { error: "Name, subject, and content_html are required" },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("newsletter_templates")
      .insert({
        name,
        subject,
        content_html,
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
  } catch (error: any) {
    console.error("Error creating template:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create template" },
      { status: 500 }
    )
  }
}
