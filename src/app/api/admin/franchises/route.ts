import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有 franchises（分站）
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Phase 2: Try to get from franchises_v2 first, then fallback to franchises
    const { getFranchiseV2ByLegacyId } = await import("@/lib/db-v2")
    
    // Get from old table
    const { data: oldData, error: oldError } = await supabaseAdmin
      .from("franchises")
      .select("id, code, name, primary_domain, timezone, branding_config, is_active")
      .order("name", { ascending: true })

    if (oldError) {
      throw new Error(oldError.message)
    }

    // Try to enrich with cancellation_policy from franchises_v2
    const enrichedData = await Promise.all((oldData || []).map(async (franchise: any) => {
      try {
        const franchiseV2 = await getFranchiseV2ByLegacyId(franchise.id)
        if (franchiseV2) {
          return {
            ...franchise,
            cancellation_policy: franchiseV2.cancellation_policy || null,
          }
        }
      } catch (error) {
        console.error(`Error fetching franchise_v2 for ${franchise.id}:`, error)
      }
      return {
        ...franchise,
        cancellation_policy: null,
      }
    }))

    return NextResponse.json(enrichedData || [], { status: 200 })
  } catch (error: any) {
    console.error("Error fetching franchises:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch franchises" },
      { status: 500 }
    )
  }
}

// 创建新的 franchise
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { code, name, primary_domain, timezone, is_active } = body

    if (!code || !name) {
      return NextResponse.json(
        { error: "Missing required fields: code, name" },
        { status: 400 }
      )
    }

    const normalizedCode = String(code).trim().toLowerCase()

    const { data, error } = await supabaseAdmin
      .from("franchises")
      .insert({
        code: normalizedCode,
        name,
        primary_domain: primary_domain || null,
        timezone: timezone || null,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select("id, code, name, primary_domain, timezone, is_active")
      .single()

    if (error) {
      console.error("Error creating franchise:", error)
      return NextResponse.json(
        { error: error.message || "Failed to create franchise" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error("Error creating franchise:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create franchise" },
      { status: 500 }
    )
  }
}


