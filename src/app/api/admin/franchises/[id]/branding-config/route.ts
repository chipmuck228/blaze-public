import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { getFranchiseV2, getFranchiseV2ByLegacyId, updateFranchiseV2 } from "@/lib/db-v2"
import type { FranchiseBrandingConfig } from "@/lib/db"

// 更新 franchise 的 branding_config
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
    const { branding_config }: { branding_config: FranchiseBrandingConfig } = body

    if (!branding_config) {
      return NextResponse.json(
        { error: "Missing branding_config" },
        { status: 400 }
      )
    }

    // 首先确定要更新的 franchise_v2.id
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

    // 更新 franchises_v2 表
    const updatedFranchise = await updateFranchiseV2(franchiseV2.id, { branding_config })

    return NextResponse.json({
      id: updatedFranchise.id,
      code: updatedFranchise.code,
      name: updatedFranchise.name,
      branding_config: updatedFranchise.branding_config,
    }, { status: 200 })
  } catch (error: any) {
    console.error("Error updating branding config:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update branding config" },
      { status: 500 }
    )
  }
}

