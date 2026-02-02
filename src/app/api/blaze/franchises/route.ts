import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有 franchises
// 使用新的 blaze_franchise 表
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get("activeOnly") === "true"

    let query = supabaseAdmin
      .from("blaze_franchise")
      .select("*")
      .order("name", { ascending: true })

    if (activeOnly) {
      query = query.eq("is_active", true)
    }

    const { data, error } = await query

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
// 使用新的 blaze_franchise 表
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { 
      code, 
      name, 
      display_name,
      description,
      domain,
      logo_url,
      branding_config,
      contact_email,
      contact_phone,
      address,
      timezone,
      locale,
      custom_config,
      is_active
    } = body

    if (!code || !name) {
      return NextResponse.json(
        { error: "Missing required fields: code, name" },
        { status: 400 }
      )
    }

    // 验证 code 格式（小写字母、数字、下划线）
    const normalizedCode = String(code).trim().toLowerCase()
    if (!/^[a-z0-9_]+$/.test(normalizedCode)) {
      return NextResponse.json(
        { error: "Code must contain only lowercase letters, numbers, and underscores" },
        { status: 400 }
      )
    }

    // 检查 code 是否已存在
    const { data: existing } = await supabaseAdmin
      .from("blaze_franchise")
      .select("id")
      .eq("code", normalizedCode)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "Franchise with this code already exists" },
        { status: 400 }
      )
    }

    // 如果提供了 domain，检查是否已存在
    if (domain) {
      const { data: existingDomain } = await supabaseAdmin
        .from("blaze_franchise")
        .select("id")
        .eq("domain", domain)
        .single()

      if (existingDomain) {
        return NextResponse.json(
          { error: "Franchise with this domain already exists" },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabaseAdmin
      .from("blaze_franchise")
      .insert({
        code: normalizedCode,
        name,
        display_name: display_name || name,
        description: description || null,
        domain: domain || null,
        logo_url: logo_url || null,
        branding_config: branding_config || {},
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        address: address || null,
        timezone: timezone || 'UTC',
        locale: locale || 'en',
        custom_config: custom_config || {},
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
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
