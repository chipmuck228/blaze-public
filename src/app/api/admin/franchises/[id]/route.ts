import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取单个 franchise
// 使用新的 franchises_v2 表
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

    // 首先尝试从 franchises_v2 表获取
    let { data, error } = await supabaseAdmin
      .from("franchises_v2")
      .select("id, code, name, primary_domain, timezone, branding_config, is_active, cancellation_policy")
      .eq("id", id)
      .single()

    // 如果找不到，可能是旧表的 ID，尝试通过 legacy_franchise_id 查找
    if (error || !data) {
      const { getFranchiseV2ByLegacyId } = await import("@/lib/db-v2")
      const franchiseV2 = await getFranchiseV2ByLegacyId(id)
      if (franchiseV2) {
        return NextResponse.json({
          id: franchiseV2.id,
          code: franchiseV2.code,
          name: franchiseV2.name,
          primary_domain: franchiseV2.primary_domain,
          timezone: franchiseV2.timezone,
          branding_config: franchiseV2.branding_config,
          is_active: franchiseV2.is_active,
          cancellation_policy: franchiseV2.cancellation_policy,
        }, { status: 200 })
      }
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
// 使用新的 franchises_v2 表
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

    // 首先尝试从 franchises_v2 表获取（可能是新表的 ID）
    const { getFranchiseV2, getFranchiseV2ByLegacyId, updateFranchiseV2 } = await import("@/lib/db-v2")
    let franchiseV2 = await getFranchiseV2(id)

    // 如果找不到，可能是旧表的 ID，尝试通过 legacy_franchise_id 查找
    if (!franchiseV2) {
      franchiseV2 = await getFranchiseV2ByLegacyId(id)
    }

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

      if (cancellation_policy !== undefined) {
        updateData.cancellation_policy = cancellation_policy
      }

      const updatedFranchise = await updateFranchiseV2(franchiseV2.id, updateData)
      return NextResponse.json(updatedFranchise, { status: 200 })
    }

    // 如果没有找到新表记录，返回错误（不再支持旧表）
    return NextResponse.json(
      { error: "Franchise not found in franchises_v2 table. Please ensure the franchise exists." },
      { status: 404 }
    )
  } catch (error: any) {
    console.error("Error updating franchise:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update franchise" },
      { status: 500 }
    )
  }
}

// 删除 franchise
// 使用新的 franchises_v2 表
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

    // 首先确定要删除的 franchise_v2.id
    const { getFranchiseV2, getFranchiseV2ByLegacyId } = await import("@/lib/db-v2")
    let franchiseV2 = await getFranchiseV2(id)

    // 如果找不到，可能是旧表的 ID，尝试通过 legacy_franchise_id 查找
    if (!franchiseV2) {
      franchiseV2 = await getFranchiseV2ByLegacyId(id)
    }

    if (!franchiseV2) {
      return NextResponse.json(
        { error: "Franchise not found in franchises_v2 table." },
        { status: 404 }
      )
    }

    const franchiseV2Id = franchiseV2.id

    // 检查是否有 campuses / instances_v2 / course_series 关联该 franchise
    const [campusesCheck, instancesV2Check, seriesCheck] = await Promise.all([
      supabaseAdmin
        .from("campuses")
        .select("id")
        .eq("franchise_id", franchiseV2Id)
        .limit(1),
      supabaseAdmin
        .from("instance_v2")
        .select("id")
        .eq("franchise_id", franchiseV2Id)
        .limit(1),
      supabaseAdmin
        .from("course_series")
        .select("id")
        .eq("franchise_id", franchiseV2Id)
        .limit(1),
    ])

    if (campusesCheck.data && campusesCheck.data.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete franchise with existing campuses. Please reassign or delete campuses first." },
        { status: 400 }
      )
    }

    if (instancesV2Check.data && instancesV2Check.data.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete franchise with existing instances. Please reassign or delete instances first." },
        { status: 400 }
      )
    }

    if (seriesCheck.data && seriesCheck.data.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete franchise with existing series. Please reassign or delete series first." },
        { status: 400 }
      )
    }

    // 删除 franchises_v2 表中的记录
    const { error } = await supabaseAdmin
      .from("franchises_v2")
      .delete()
      .eq("id", franchiseV2Id)

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


