import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { supabaseAdmin } from "@/lib/supabase"
import { catalogCols, catalogFrom, catalogTables, publicRecommendOfferingSelect } from "@/lib/catalog-db"

/**
 * GET /api/public/offerings/recommend?offeringTypeId=xxx&excludeOfferingId=yyy&categoryId=zzz&limit=4
 * Returns published offerings of the same type (and optionally same category) for recommendations.
 * Excludes the given offering id.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const offeringTypeId = searchParams.get("offeringTypeId")?.trim()
    const excludeOfferingId = searchParams.get("excludeOfferingId")?.trim()
    const categoryId = searchParams.get("categoryId")?.trim()
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "4", 10) || 4, 10)

    if (!offeringTypeId) {
      return NextResponse.json(
        { error: "offeringTypeId is required" },
        { status: 400 }
      )
    }

    const stageCol = catalogCols.offering.stageId

    let query = catalogFrom("offering")
      .select(publicRecommendOfferingSelect())
      .eq("status", "published")
      .eq("offering_type_id", offeringTypeId)
      .limit(limit)

    if (excludeOfferingId) {
      query = query.neq("id", excludeOfferingId)
    }
    if (categoryId && stageCol) {
      query = query.eq(stageCol, categoryId)
    }

    const { data: rows, error } = await query

    if (error) {
      console.error(`[${catalogTables.offering}] Error:`, error)
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
    }

    const list = (rows || []).map((row: Record<string, unknown>) => {
      const cat = Array.isArray(row.category) ? row.category[0] : row.category
      const categorySlug = cat?.name ? String(cat.name).replace(/_/g, "-") : undefined
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        poster_url: row.poster_url,
        base_price: row.base_price,
        category: cat ? { id: cat.id, name: cat.name, display_name: cat.display_name, slug: categorySlug } : undefined,
      }
    })

    return NextResponse.json(list, { status: 200 })
  } catch (err: unknown) {
    console.error(`[${catalogTables.offering}] Error:`, err)
    return NextResponse.json(
      { error: err instanceof Error ? getErrorMessage(err) : "Failed to fetch recommendations" },
      { status: 500 }
    )
  }
}
