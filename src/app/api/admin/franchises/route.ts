import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有 franchises（分站）
// 使用新的 franchises_v2 表
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get from franchises_v2 table
    const { data, error } = await supabaseAdmin
      .from("franchises_v2")
      .select("id, code, name, primary_domain, timezone, branding_config, is_active, cancellation_policy, legacy_franchise_id")
      .order("name", { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json(data || [], { status: 200 })
  } catch (error: any) {
    console.error("Error fetching franchises:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch franchises" },
      { status: 500 }
    )
  }
}

// 创建新的 franchise
// 使用新的 franchises_v2 表
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { code, name, primary_domain, timezone, is_active, branding_config, cancellation_policy } = body

    if (!code || !name) {
      return NextResponse.json(
        { error: "Missing required fields: code, name" },
        { status: 400 }
      )
    }

    const normalizedCode = String(code).trim().toLowerCase()

    const { data, error } = await supabaseAdmin
      .from("franchises_v2")
      .insert({
        code: normalizedCode,
        name,
        primary_domain: primary_domain || null,
        timezone: timezone || null,
        is_active: is_active !== undefined ? is_active : true,
        branding_config: branding_config || null,
        cancellation_policy: cancellation_policy || null,
      })
      .select("id, code, name, primary_domain, timezone, branding_config, is_active, cancellation_policy")
      .single()

    if (error) {
      console.error("Error creating franchise:", error)
      return NextResponse.json(
        { error: error.message || "Failed to create franchise" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error("Error creating franchise:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create franchise" },
      { status: 500 }
    )
  }
}


