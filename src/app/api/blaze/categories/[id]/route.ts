import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取单个 category
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
      .from("blaze_category")
      .select(`
        *,
        franchise:blaze_franchise(
          id,
          code,
          name
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Category not found" }, { status: 404 })
      }
      throw new Error(error.message)
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching category:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch category" },
      { status: 500 }
    )
  }
}

// 更新 category
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
      franchise_id,
      name, 
      display_name,
      description,
      poster_url,
      featured,
      featured_slogan,
      featured_subtitle,
      featured_display_order,
      display_order,
      is_active
    } = body

    if (!display_name) {
      return NextResponse.json(
        { error: "Missing required field: display_name" },
        { status: 400 }
      )
    }

    // 验证：如果 featured = true，必须 is_active = true
    if (featured && is_active === false) {
      return NextResponse.json(
        { error: "Category must be active to be featured" },
        { status: 400 }
      )
    }

    // 如果提供了 franchise_id，验证它存在
    if (franchise_id) {
      const { data: franchise, error: franchiseError } = await supabaseAdmin
        .from("blaze_franchise")
        .select("id")
        .eq("id", franchise_id)
        .single()

      if (franchiseError || !franchise) {
        return NextResponse.json(
          { error: "Invalid franchise_id. Franchise must exist in blaze_franchise table." },
          { status: 400 }
        )
      }
    }

    // 如果提供了 name，检查在 franchise_id 下是否已存在（小写标准化）
    if (name) {
      const normalizedName = name.toLowerCase().trim()
      // 获取当前 category 的 franchise_id（如果未提供）
      const currentCategory = await supabaseAdmin
        .from("blaze_category")
        .select("franchise_id")
        .eq("id", id)
        .single()

      const targetFranchiseId = franchise_id || currentCategory.data?.franchise_id

      if (targetFranchiseId) {
        const { data: existing } = await supabaseAdmin
          .from("blaze_category")
          .select("id")
          .eq("franchise_id", targetFranchiseId)
          .ilike("name", normalizedName)
          .neq("id", id)
          .single()

        if (existing) {
          return NextResponse.json(
            { error: "Category with this name already exists for this franchise" },
            { status: 400 }
          )
        }
      }
    }

    const updateData: any = {
      display_name,
      description: description !== undefined ? description : null,
      poster_url: poster_url !== undefined ? poster_url : null,
      featured: featured !== undefined ? featured : false,
      featured_slogan: featured_slogan !== undefined ? featured_slogan : null,
      featured_subtitle: featured_subtitle !== undefined ? featured_subtitle : null,
      featured_display_order: featured_display_order !== undefined ? featured_display_order : 0,
      display_order: display_order !== undefined ? display_order : 0,
      updated_at: new Date().toISOString(),
    }

    if (name) {
      updateData.name = name.toLowerCase().trim()
    }

    if (franchise_id !== undefined) {
      updateData.franchise_id = franchise_id
    }

    if (is_active !== undefined) {
      updateData.is_active = is_active
    }

    const { data, error } = await supabaseAdmin
      .from("blaze_category")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        franchise:blaze_franchise(
          id,
          code,
          name
        )
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Category not found" }, { status: 404 })
      }
      console.error("Error updating category:", error)
      return NextResponse.json(
        { error: error.message || "Failed to update category" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error updating category:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update category" },
      { status: 500 }
    )
  }
}

// 删除 category
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

    // 检查是否有 programs 使用此 category
    const { data: programs, error: programsError } = await supabaseAdmin
      .from("blaze_program")
      .select("id")
      .eq("category_id", id)
      .limit(1)

    if (programsError) {
      console.error("Error checking programs:", programsError)
    }

    if (programs && programs.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete category. There are programs using this category." },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("blaze_category")
      .delete()
      .eq("id", id)

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Category not found" }, { status: 404 })
      }
      console.error("Error deleting category:", error)
      return NextResponse.json(
        { error: error.message || "Failed to delete category" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Category deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting category:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete category" },
      { status: 500 }
    )
  }
}
