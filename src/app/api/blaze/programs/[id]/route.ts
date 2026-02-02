import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取单个 program
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
      .from("blaze_program")
      .select(`
        *,
        category:blaze_category(
          id,
          name,
          display_name,
          franchise_id
        ),
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
        return NextResponse.json({ error: "Program not found" }, { status: 404 })
      }
      throw new Error(error.message)
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching program:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch program" },
      { status: 500 }
    )
  }
}

// 更新 program
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
      category_id,
      franchise_id,
      name, 
      display_name,
      description,
      start_date,
      end_date,
      display_order,
      is_active
    } = body

    if (!display_name) {
      return NextResponse.json(
        { error: "Missing required field: display_name" },
        { status: 400 }
      )
    }

    if (start_date && end_date) {
      // 验证日期
      if (new Date(start_date) > new Date(end_date)) {
        return NextResponse.json(
          { error: "start_date must be less than or equal to end_date" },
          { status: 400 }
        )
      }
    }

    // 如果提供了 category_id 或 franchise_id，验证它们
    if (category_id || franchise_id) {
      // 获取当前 program 的 category_id 和 franchise_id
      const { data: currentProgram } = await supabaseAdmin
        .from("blaze_program")
        .select("category_id, franchise_id")
        .eq("id", id)
        .single()

      const targetCategoryId = category_id || currentProgram?.category_id
      const targetFranchiseId = franchise_id || currentProgram?.franchise_id

      if (targetCategoryId) {
        // 验证 category_id 存在
        const { data: category, error: categoryError } = await supabaseAdmin
          .from("blaze_category")
          .select("id, franchise_id")
          .eq("id", targetCategoryId)
          .single()

        if (categoryError || !category) {
          return NextResponse.json(
            { error: "Invalid category_id. Category must exist in blaze_category table." },
            { status: 400 }
          )
        }

        // 验证 category 的 franchise_id 与提供的 franchise_id 匹配
        if (targetFranchiseId && category.franchise_id !== targetFranchiseId) {
          return NextResponse.json(
            { error: "category_id and franchise_id do not match. Category must belong to the specified franchise." },
            { status: 400 }
          )
        }
      }

      if (targetFranchiseId) {
        // 验证 franchise_id 存在
        const { data: franchise, error: franchiseError } = await supabaseAdmin
          .from("blaze_franchise")
          .select("id")
          .eq("id", targetFranchiseId)
          .single()

        if (franchiseError || !franchise) {
          return NextResponse.json(
            { error: "Invalid franchise_id. Franchise must exist in blaze_franchise table." },
            { status: 400 }
          )
        }
      }
    }

    // 如果提供了 name，验证格式并检查唯一性
    if (name) {
      const normalizedName = name.toLowerCase().trim()
      if (!/^[a-z0-9_]+$/.test(normalizedName)) {
        return NextResponse.json(
          { error: "Name must contain only lowercase letters, numbers, and underscores" },
          { status: 400 }
        )
      }

      // 获取目标 category_id 和 franchise_id
      const { data: currentProgram } = await supabaseAdmin
        .from("blaze_program")
        .select("category_id, franchise_id")
        .eq("id", id)
        .single()

      const targetCategoryId = category_id || currentProgram?.category_id
      const targetFranchiseId = franchise_id || currentProgram?.franchise_id

      if (targetCategoryId && targetFranchiseId) {
        // 检查 name 在 category_id 和 franchise_id 组合下是否已存在
        const { data: existing } = await supabaseAdmin
          .from("blaze_program")
          .select("id")
          .eq("category_id", targetCategoryId)
          .eq("franchise_id", targetFranchiseId)
          .ilike("name", normalizedName)
          .neq("id", id)
          .single()

        if (existing) {
          return NextResponse.json(
            { error: "Program with this name already exists for this category and franchise" },
            { status: 400 }
          )
        }
      }
    }

    const updateData: any = {
      display_name,
      description: description !== undefined ? description : null,
      display_order: display_order !== undefined ? display_order : 0,
      updated_at: new Date().toISOString(),
    }

    if (name) {
      updateData.name = name.toLowerCase().trim()
    }

    if (category_id !== undefined) {
      updateData.category_id = category_id
    }

    if (franchise_id !== undefined) {
      updateData.franchise_id = franchise_id
    }

    if (start_date !== undefined) {
      updateData.start_date = start_date
    }

    if (end_date !== undefined) {
      updateData.end_date = end_date
    }

    if (is_active !== undefined) {
      updateData.is_active = is_active
    }

    const { data, error } = await supabaseAdmin
      .from("blaze_program")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        category:blaze_category(
          id,
          name,
          display_name,
          franchise_id
        ),
        franchise:blaze_franchise(
          id,
          code,
          name
        )
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Program not found" }, { status: 404 })
      }
      console.error("Error updating program:", error)
      return NextResponse.json(
        { error: error.message || "Failed to update program" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error updating program:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update program" },
      { status: 500 }
    )
  }
}

// 删除 program
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

    // 检查是否有 instances 使用此 program
    const { data: instances, error: instancesError } = await supabaseAdmin
      .from("blaze_instance")
      .select("id")
      .eq("program_id", id)
      .limit(1)

    if (instancesError) {
      console.error("Error checking instances:", instancesError)
    }

    if (instances && instances.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete program. There are instances using this program." },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("blaze_program")
      .delete()
      .eq("id", id)

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Program not found" }, { status: 404 })
      }
      console.error("Error deleting program:", error)
      return NextResponse.json(
        { error: error.message || "Failed to delete program" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Program deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting program:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete program" },
      { status: 500 }
    )
  }
}
