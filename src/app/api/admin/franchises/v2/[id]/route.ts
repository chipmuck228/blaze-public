/**
 * Phase 2: 新 API 端点 - Franchises V2
 * 更新 Franchise（更新 franchises_v2 表）
 */

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { updateFranchiseV2, getFranchiseV2 } from "@/lib/db-v2"

// 获取单个 Franchise V2
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

    const franchise = await getFranchiseV2(id)

    if (!franchise) {
      return NextResponse.json({ error: "Franchise not found" }, { status: 404 })
    }

    return NextResponse.json(franchise, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching franchise v2:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch franchise" },
      { status: 500 }
    )
  }
}

// 更新 Franchise V2（支持更新 cancellation_policy）
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
      primary_domain,
      timezone,
      branding_config,
      is_active,
      cancellation_policy, // 新增字段
    } = body

    if (!code || !name) {
      return NextResponse.json(
        { error: "Missing required fields: code, name" },
        { status: 400 }
      )
    }

    const updateData: any = {
      code: String(code).trim().toLowerCase(),
      name,
      primary_domain: primary_domain || null,
      timezone: timezone || null,
      is_active: is_active !== undefined ? is_active : true,
    }

    // 如果提供了 branding_config，则更新它
    if (branding_config !== undefined) {
      updateData.branding_config = branding_config
    }

    // 如果提供了 cancellation_policy，则更新它
    if (cancellation_policy !== undefined) {
      updateData.cancellation_policy = cancellation_policy
    }

    const franchise = await updateFranchiseV2(id, updateData)

    return NextResponse.json(franchise, { status: 200 })
  } catch (error: any) {
    console.error("Error updating franchise v2:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update franchise" },
      { status: 500 }
    )
  }
}
