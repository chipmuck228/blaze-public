import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取单个 franchise (使用 v2 表)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const { data: franchise, error } = await supabaseAdmin
      .from("v2_franchise")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
      return NextResponse.json({ error: "Franchise not found" }, { status: 404 })
      }
      throw new Error(error.message)
    }

    return NextResponse.json(franchise, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching franchise:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch franchise" },
      { status: 500 }
    )
  }
}

// 更新 franchise (使用 v2 表)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
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

    // 获取现有的 franchise
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("v2_franchise")
      .select("code, domain")
      .eq("id", id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: "Franchise not found" },
        { status: 404 }
      )
    }

    // 如果 code 改变，检查新 code 是否已存在
    if (code && code !== existing.code) {
      // 验证 code 格式
      if (!/^[a-z0-9_]+$/.test(code)) {
        return NextResponse.json(
          { error: "Code must contain only lowercase letters, numbers, and underscores" },
        { status: 400 }
      )
    }

      const { data: codeExists } = await supabaseAdmin
        .from("v2_franchise")
        .select("id")
        .eq("code", code)
        .neq("id", id)
        .single()

      if (codeExists) {
        return NextResponse.json(
          { error: "Franchise with this code already exists" },
          { status: 400 }
        )
      }
    }

    // 如果 domain 改变，检查新 domain 是否已存在
    if (domain !== undefined && domain !== existing.domain) {
      if (domain) {
        const { data: domainExists } = await supabaseAdmin
          .from("v2_franchise")
          .select("id")
          .eq("domain", domain)
          .neq("id", id)
          .single()

        if (domainExists) {
          return NextResponse.json(
            { error: "Franchise with this domain already exists" },
            { status: 400 }
          )
        }
      }
    }

    // 更新 franchise
    const updateData: any = {}
    if (code !== undefined) updateData.code = code
    if (name !== undefined) updateData.name = name
    if (domain !== undefined) updateData.domain = domain || null
    if (logo_url !== undefined) updateData.logo_url = logo_url || null
    if (poster_url !== undefined) updateData.poster_url = poster_url || null
    if (branding_config !== undefined) updateData.branding_config = branding_config || {}
    if (marketing_config !== undefined) updateData.marketing_config = marketing_config || {}
    if (contact_email !== undefined) updateData.contact_email = contact_email || null
    if (contact_phone !== undefined) updateData.contact_phone = contact_phone || null
    if (address !== undefined) updateData.address = address || null
    if (timezone !== undefined) updateData.timezone = timezone
    if (locale !== undefined) updateData.locale = locale
    if (is_active !== undefined) updateData.is_active = is_active

    const { data: franchise, error: updateError } = await supabaseAdmin
      .from("v2_franchise")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      throw new Error(updateError.message)
    }

    return NextResponse.json(franchise, { status: 200 })
  } catch (error: any) {
    console.error("Error updating franchise:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update franchise" },
      { status: 500 }
    )
  }
}

// 删除 franchise (使用 v2 表)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // 检查是否有相关的数据使用此 franchise
    // 检查 categories
    const { data: categoriesData } = await supabaseAdmin
      .from("v2_category")
      .select("id")
      .eq("franchise_id", id)
      .limit(1)

    if (categoriesData && categoriesData.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete franchise that has categories. Please delete or reassign categories first." },
        { status: 400 }
      )
    }

    // 检查 campuses
    const { data: campusesData } = await supabaseAdmin
      .from("v2_campus")
      .select("id")
      .eq("franchise_id", id)
      .limit(1)

    if (campusesData && campusesData.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete franchise that has campuses. Please delete or reassign campuses first." },
        { status: 400 }
      )
    }

    // 检查 programs
    const { data: programsData } = await supabaseAdmin
      .from("v2_program")
      .select("id")
      .eq("franchise_id", id)
      .limit(1)

    if (programsData && programsData.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete franchise that has programs. Please delete or reassign programs first." },
        { status: 400 }
      )
    }

    // 删除 franchise
    const { error } = await supabaseAdmin
      .from("v2_franchise")
      .delete()
      .eq("id", id)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting franchise:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete franchise" },
      { status: 500 }
    )
  }
}
