/**
 * Phase 2: 新 API 端点 - Available Offerings V2
 * 获取可用的 Offerings（status = 'published'）从 offerings_v2 表
 */

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAvailableOfferingsV2 } from "@/lib/db-v2"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const offeringType = searchParams.get("offeringType")
    const search = searchParams.get("search")
    const categoryId = searchParams.get("categoryId")

    const offerings = await getAvailableOfferingsV2(
      offeringType || undefined,
      search || undefined,
      categoryId || undefined
    )

    return NextResponse.json(offerings, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching available offerings v2:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch available offerings" },
      { status: 500 }
    )
  }
}
