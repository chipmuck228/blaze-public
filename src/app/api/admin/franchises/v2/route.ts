import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有 franchises (使用 v2 表)
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get("includeInactive") === "true"

    let query = supabaseAdmin
      .from("v2_franchise")
      .select("*")
      .order("name", { ascending: true })

    if (!includeInactive) {
      query = query.eq("is_active", true)
    }

    const { data: franchises, error } = await query

    if (error) {
      throw new Error(getErrorMessage(error))
    }

    return NextResponse.json(franchises || [], { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching franchises:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch franchises" },
      { status: 500 }
    )
  }
}

// 创建新 franchise (使用 v2 表)
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
      domain,
      logo_url,
      poster_url,
      branding_config,
      marketing_config,
      contact_email,
      contact_phone,
      address,
      timezone,
      locale,
      is_active,
    } = body

    if (!code || !name) {
      return NextResponse.json(
        { error: "Missing required fields: code, name" },
        { status: 400 }
      )
    }

    // 验证 code 格式（只能包含小写字母、数字和下划线）
    if (!/^[a-z0-9_]+$/.test(code)) {
      return NextResponse.json(
        { error: "Code must contain only lowercase letters, numbers, and underscores" },
        { status: 400 }
      )
    }

    // 检查 code 是否已存在
    const { data: existingCode } = await supabaseAdmin
      .from("v2_franchise")
      .select("id")
      .eq("code", code)
      .single()

    if (existingCode) {
      return NextResponse.json(
        { error: "Franchise with this code already exists" },
        { status: 400 }
      )
    }

    // 如果提供了 domain，检查是否已存在
    if (domain) {
      const { data: existingDomain } = await supabaseAdmin
        .from("v2_franchise")
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

    // 创建 franchise
    const { data: franchise, error: createError } = await supabaseAdmin
      .from("v2_franchise")
      .insert({
        code,
        name,
        domain: domain || null,
        logo_url: logo_url || null,
        poster_url: poster_url || null,
        branding_config: branding_config || {},
        marketing_config: marketing_config || {},
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        address: address || null,
        timezone: timezone || "UTC",
        locale: locale || "en",
        is_active: is_active !== undefined ? is_active : true,
      })
      .select()
      .single()

    if (createError) {
      throw new Error(createError.message)
    }

    return NextResponse.json(franchise, { status: 201 })
  } catch (error: unknown) {
    console.error("Error creating franchise:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to create franchise" },
      { status: 500 }
    )
  }
}
