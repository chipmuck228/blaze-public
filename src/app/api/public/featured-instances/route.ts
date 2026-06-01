import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { supabaseAdmin } from "@/lib/supabase"
import {
  FEATURED_INSTANCE_SELECT,
  mapInstanceRowToFeaturedSession,
  sortFeaturedInstanceRows,
} from "@/lib/featured-sessions"

/**
 * GET /api/public/featured-instances?location=mill-creek&limit=6
 * Returns featured v2_instance rows for hero carousels.
 * - Without location: global featured instances (all franchises), max 6
 * - With location: featured instances for that franchise code, max 6
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const locationCode = searchParams.get("location")?.trim() || null
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "6", 10) || 6, 1), 6)

    let franchiseId: string | null = null
    if (locationCode) {
      const { data: franchise, error: franchiseError } = await supabaseAdmin
        .from("v2_franchise")
        .select("id")
        .eq("code", locationCode.toLowerCase())
        .eq("is_active", true)
        .maybeSingle()

      if (franchiseError) {
        throw new Error(franchiseError.message)
      }
      franchiseId = franchise?.id ?? null
      if (!franchiseId) {
        return NextResponse.json({ instances: [] }, { status: 200 })
      }
    }

    let query = supabaseAdmin
      .from("v2_instance")
      .select(FEATURED_INSTANCE_SELECT)
      .eq("is_active", true)
      .eq("featured", true)
      .in("status", ["scheduled", "ongoing"])

    if (franchiseId) {
      query = query.eq("program.franchise_id", franchiseId)
    }

    const { data: rows, error } = await query

    if (error) {
      throw new Error(getErrorMessage(error))
    }

    const instances = sortFeaturedInstanceRows(rows || [])
      .map(mapInstanceRowToFeaturedSession)
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, limit)

    return NextResponse.json({ instances }, { status: 200 })
  } catch (error: unknown) {
    console.error("[v2_instance] Error:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch featured instances" },
      { status: 500 }
    )
  }
}
