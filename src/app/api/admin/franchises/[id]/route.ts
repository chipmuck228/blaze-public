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
      .from("franchises")
      .select("id, code, name, primary_domain, timezone, branding_config, is_active")
      .eq("id", id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Franchise not found" }, { status: 404 })
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
// Phase 2: 自动映射到新表（franchises_v2），支持 cancellation_policy
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
    const { code, name, primary_domain, timezone, branding_config, is_active, cancellation_policy } = body

    if (!code || !name) {
      return NextResponse.json(
        { error: "Missing required fields: code, name" },
        { status: 400 }
      )
    }

    const normalizedCode = String(code).trim().toLowerCase()

    // Phase 2: 尝试映射到新表
    const { getFranchiseV2ByLegacyId, updateFranchiseV2 } = await import("@/lib/db-v2")
    const franchiseV2 = await getFranchiseV2ByLegacyId(id)

    if (franchiseV2) {
      // 如果找到新表记录，更新新表
      const updateData: any = {
        code: normalizedCode,
        name,
        primary_domain: primary_domain || null,
        timezone: timezone || null,
        is_active: is_active !== undefined ? is_active : true,
      }

      if (branding_config !== undefined) {
        updateData.branding_config = branding_config
      }

      // Phase 2: 支持更新 cancellation_policy
      if (cancellation_policy !== undefined) {
        updateData.cancellation_policy = cancellation_policy
      }

      const updatedFranchise = await updateFranchiseV2(franchiseV2.id, updateData)

      // 同时更新旧表（保持同步）
      const { error: legacyError } = await supabaseAdmin
        .from("franchises")
        .update({
          code: normalizedCode,
          name,
          primary_domain: primary_domain || null,
          timezone: timezone || null,
          is_active: is_active !== undefined ? is_active : true,
          branding_config: branding_config !== undefined ? branding_config : undefined,
        })
        .eq("id", id)

      if (legacyError) {
        console.warn("Warning: Failed to update legacy franchise table:", legacyError)
        // 不抛出错误，因为新表已更新成功
      }

      return NextResponse.json({
        ...updatedFranchise,
        legacy_id: id, // 返回旧表 ID 以便向后兼容
      }, { status: 200 })
    }

    // 如果没有找到新表记录，更新旧表（向后兼容）
    const updateData: any = {
      code: normalizedCode,
      name,
      primary_domain: primary_domain || null,
      timezone: timezone || null,
      is_active: is_active !== undefined ? is_active : true,
    }

    if (branding_config !== undefined) {
      updateData.branding_config = branding_config
    }

    const { data, error } = await supabaseAdmin
      .from("franchises")
      .update(updateData)
      .eq("id", id)
      .select("id, code, name, primary_domain, timezone, branding_config, is_active")
      .single()

    if (error) {
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

    // 检查是否有 locations / instances / enrollments 关联该 franchise
    const [locationsCheck, instancesCheck, enrollmentsCheck] = await Promise.all([
      supabaseAdmin
        .from("course_locations")
        .select("id")
        .eq("franchise_id", id)
        .limit(1),
      supabaseAdmin
        .from("course_instances")
        .select("id")
        .eq("franchise_id", id)
        .limit(1),
      supabaseAdmin
        .from("course_enrollments")
        .select("id")
        .eq("franchise_id", id)
        .limit(1),
    ])

    if (locationsCheck.data && locationsCheck.data.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete franchise with existing locations. Please reassign or delete locations first." },
        { status: 400 }
      )
    }

    if (instancesCheck.data && instancesCheck.data.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete franchise with existing instances. Please reassign or delete instances first." },
        { status: 400 }
      )
    }

    if (enrollmentsCheck.data && enrollmentsCheck.data.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete franchise with existing enrollments." },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("franchises")
      .delete()
      .eq("id", id)

    if (error) {
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


