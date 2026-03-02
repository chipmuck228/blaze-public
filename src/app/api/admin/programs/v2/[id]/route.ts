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
      .from("v2_program")
      .select(`
        *,
        category:v2_category(
          id,
          name,
          display_name,
          description,
          poster_url,
          is_active
        ),
        franchise:v2_franchise(
          id,
          code,
          name,
          is_active
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Program not found" },
          { status: 404 }
        )
      }
      console.error("Error fetching program:", error)
      return NextResponse.json(
        { error: error.message || "Failed to fetch program" },
        { status: 500 }
      )
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
      display_name,
      description,
      start_date,
      end_date,
      display_order,
      is_active,
      featured,
      poster_url,
    } = body

    // 验证必填字段
    if (!display_name || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required fields: display_name, start_date, end_date" },
        { status: 400 }
      )
    }

    // 验证日期范围
    if (new Date(start_date) > new Date(end_date)) {
      return NextResponse.json(
        { error: "start_date must be less than or equal to end_date" },
        { status: 400 }
      )
    }

    // 检查 program 是否存在
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("v2_program")
      .select("id, franchise_id, category_id, name, display_order, is_active, featured, poster_url")
      .eq("id", id)
      .single()

    if (existingError || !existing) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 }
      )
    }

    // 更新 program（不允许修改 franchise_id, category_id, name）
    const updateData: any = {
      display_name,
      description: description || null,
      start_date,
      end_date,
      display_order: display_order !== undefined ? display_order : existing.display_order,
      is_active: is_active !== undefined ? is_active : existing.is_active,
      ...(featured !== undefined && { featured: featured === true }),
      ...(poster_url !== undefined && { poster_url: poster_url || null }),
    }

    const { data, error } = await supabaseAdmin
      .from("v2_program")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        category:v2_category(
          id,
          name,
          display_name,
          description,
          poster_url,
          is_active
        ),
        franchise:v2_franchise(
          id,
          code,
          name,
          is_active
        )
      `)
      .single()

    if (error) {
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

    // 检查 program 是否存在
    const { data: existing, error: existingError } = await supabaseAdmin
      .from("v2_program")
      .select("id")
      .eq("id", id)
      .single()

    if (existingError || !existing) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 }
      )
    }

    // 检查是否有关联的 instances
    const { data: instances, error: instancesError } = await supabaseAdmin
      .from("v2_instance")
      .select("id")
      .eq("program_id", id)
      .limit(1)

    if (instancesError) {
      console.error("Error checking instances:", instancesError)
      return NextResponse.json(
        { error: "Failed to check for associated instances" },
        { status: 500 }
      )
    }

    if (instances && instances.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete program: there are instances associated with this program. Please delete or reassign instances first." },
        { status: 400 }
      )
    }

    // 删除 program
    const { error } = await supabaseAdmin
      .from("v2_program")
      .delete()
      .eq("id", id)

    if (error) {
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
