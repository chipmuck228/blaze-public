/**
 * Phase 2: 获取可用 Offerings API
 * 支持 useLegacy 参数，默认使用新表（offerings_v2）
 */

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAvailableOfferingsV2 } from "@/lib/db-v2"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const offeringType = searchParams.get("offeringType")
    const search = searchParams.get("search")
    const useLegacy = searchParams.get("useLegacy") === "true"

    // Phase 2: 如果 useLegacy=false，使用新表（默认）
    if (!useLegacy) {
      const offerings = await getAvailableOfferingsV2(
        offeringType || undefined,
        search || undefined
      )
      return NextResponse.json(offerings, { status: 200 })
    }

    // 使用旧表（向后兼容）
    let query = supabaseAdmin
      .from("offerings")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false })

    if (offeringType) {
      query = query.eq("offering_type", offeringType)
    }

    const { data: offerings, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    // 如果提供了搜索参数，进行过滤
    let filteredOfferings = offerings || []
    if (search) {
      const searchLower = search.toLowerCase()
      filteredOfferings = filteredOfferings.filter(
        (offering: any) =>
          offering.name?.toLowerCase().includes(searchLower) ||
          offering.description?.toLowerCase().includes(searchLower) ||
          offering.slug?.toLowerCase().includes(searchLower)
      )
    }

    return NextResponse.json(filteredOfferings, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching available offerings:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch available offerings" },
      { status: 500 }
    )
  }
}
