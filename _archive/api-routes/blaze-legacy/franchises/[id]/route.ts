import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取单个 franchise
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
      .from("blaze_franchise")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Franchise not found" }, { status: 404 })
      }
      throw new Error(error.message)
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching franchise:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch franchise" },
      { status: 500 }
    )
  }
}

// 更新 franchise
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

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      )
    }

    // 如果提供了 code，验证格式并检查唯一性
    if (code) {
      const normalizedCode = String(code).trim().toLowerCase()
      if (!/^[a-z0-9_]+$/.test(normalizedCode)) {
        return NextResponse.json(
          { error: "Code must contain only lowercase letters, numbers, and underscores" },
          { status: 400 }
        )
      }

      // 检查 code 是否被其他 franchise 使用
      const { data: existing } = await supabaseAdmin
        .from("blaze_franchise")
        .select("id")
        .eq("code", normalizedCode)
        .neq("id", id)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: "Franchise with this code already exists" },
          { status: 400 }
        )
      }
    }

    // 如果提供了 domain，检查唯一性
    if (domain) {
      const { data: existingDomain } = await supabaseAdmin
        .from("blaze_franchise")
        .select("id")
        .eq("domain", domain)
        .neq("id", id)
        .single()

      if (existingDomain) {
        return NextResponse.json(
          { error: "Franchise with this domain already exists" },
          { status: 400 }
        )
      }
    }

    const updateData: any = {
      name,
      display_name: display_name || name,
      description: description !== undefined ? description : null,
      domain: domain !== undefined ? domain : null,
      logo_url: logo_url !== undefined ? logo_url : null,
      branding_config: branding_config !== undefined ? branding_config : {},
      contact_email: contact_email !== undefined ? contact_email : null,
      contact_phone: contact_phone !== undefined ? contact_phone : null,
      address: address !== undefined ? address : null,
      timezone: timezone !== undefined ? timezone : 'UTC',
      locale: locale !== undefined ? locale : 'en',
      custom_config: custom_config !== undefined ? custom_config : {},
      updated_at: new Date().toISOString(),
    }

    if (code) {
      updateData.code = String(code).trim().toLowerCase()
    }

    if (is_active !== undefined) {
      updateData.is_active = is_active
    }

    const { data, error } = await supabaseAdmin
      .from("blaze_franchise")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Franchise not found" }, { status: 404 })
      }
      console.error("Error updating franchise:", error)
      return NextResponse.json(
        { error: error.message || "Failed to update franchise" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error updating franchise:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update franchise" },
      { status: 500 }
    )
  }
}

// 删除 franchise
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

    // 检查是否有 categories 使用此 franchise
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from("blaze_category")
      .select("id")
      .eq("franchise_id", id)
      .limit(1)

    if (categoriesError) {
      console.error("Error checking categories:", categoriesError)
    }

    if (categories && categories.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete franchise. There are categories using this franchise." },
        { status: 400 }
      )
    }

    // 检查是否有 campuses 使用此 franchise
    const { data: campuses, error: campusesError } = await supabaseAdmin
      .from("blaze_campus")
      .select("id")
      .eq("franchise_id", id)
      .limit(1)

    if (campusesError) {
      console.error("Error checking campuses:", campusesError)
    }

    if (campuses && campuses.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete franchise. There are campuses using this franchise." },
        { status: 400 }
      )
    }

    // 检查是否有 programs 使用此 franchise
    const { data: programs, error: programsError } = await supabaseAdmin
      .from("blaze_program")
      .select("id")
      .eq("franchise_id", id)
      .limit(1)

    if (programsError) {
      console.error("Error checking programs:", programsError)
    }

    if (programs && programs.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete franchise. There are programs using this franchise." },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("blaze_franchise")
      .delete()
      .eq("id", id)

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Franchise not found" }, { status: 404 })
      }
      console.error("Error deleting franchise:", error)
      return NextResponse.json(
        { error: error.message || "Failed to delete franchise" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Franchise deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting franchise:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete franchise" },
      { status: 500 }
    )
  }
}
