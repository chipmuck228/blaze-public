import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { supabaseAdmin } from "@/lib/supabase"
import {
  FEATURED_INSTANCE_SELECT,
  getFeaturedInstanceSelect,
  mapInstanceRowToFeaturedSession,
  sortFeaturedInstanceRows,
} from "@/lib/featured-sessions"
import { catalogCols, catalogTables, isMissingPosterUrlColumnError } from "@/lib/catalog-db"

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
        .from(catalogTables.campus)
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
      .from(catalogTables.session)
      .select(FEATURED_INSTANCE_SELECT)
      .eq("is_active", true)
      .eq("featured", true)
      .in("status", ["scheduled", "ongoing"])

    if (franchiseId) {
      query = query.eq(`program.${catalogCols.series.campusId}`, franchiseId)
    }

    let { data: rows, error } = await query

    if (error && isMissingPosterUrlColumnError(error)) {
      console.warn(
        `[${catalogTables.session}] v3_series.poster_url missing — run v3/16_v3_poster_url_columns.sql in Supabase SQL Editor`
      )
      let fallbackQuery = supabaseAdmin
        .from(catalogTables.session)
        .select(getFeaturedInstanceSelect({ includeSeriesPoster: false }))
        .eq("is_active", true)
        .eq("featured", true)
        .in("status", ["scheduled", "ongoing"])
      if (franchiseId) {
        fallbackQuery = fallbackQuery.eq(`program.${catalogCols.series.campusId}`, franchiseId)
      }
      ;({ data: rows, error } = await fallbackQuery)
    }

    if (error) {
      throw new Error(getErrorMessage(error))
    }

    const instances = sortFeaturedInstanceRows(rows || [])
      .map(mapInstanceRowToFeaturedSession)
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, limit)

    return NextResponse.json({ instances }, { status: 200 })
  } catch (error: unknown) {
    console.error(`[${catalogTables.session}] Error:`, error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch featured instances" },
      { status: 500 }
    )
  }
}
