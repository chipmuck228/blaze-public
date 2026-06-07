import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { supabaseAdmin } from "@/lib/supabase"
import { catalogCols, catalogTables, normalizeSeriesRow } from "@/lib/catalog-db"

/**
 * GET /api/public/series?campus=bellevue&stage=ignitecuriosity
 * Returns active series (Activity) for a campus + stage — no sessions.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const campusCode = searchParams.get("campus")?.trim().toLowerCase()
    const stageName = searchParams.get("stage")?.trim().toLowerCase()

    if (!campusCode || !stageName) {
      return NextResponse.json(
        { error: "Missing required query params: campus, stage" },
        { status: 400 }
      )
    }

    const { data: campus, error: campusError } = await supabaseAdmin
      .from(catalogTables.campus)
      .select("id, code, name")
      .eq("code", campusCode)
      .eq("is_active", true)
      .maybeSingle()

    if (campusError) {
      console.error(`[${catalogTables.campus}] Error:`, campusError)
      return NextResponse.json({ error: getErrorMessage(campusError) }, { status: 500 })
    }

    if (!campus) {
      return NextResponse.json({ error: "Campus not found" }, { status: 404 })
    }

    const { data: stage, error: stageError } = await supabaseAdmin
      .from(catalogTables.stage)
      .select("id, name, display_name")
      .eq("name", stageName)
      .eq("is_active", true)
      .maybeSingle()

    if (stageError) {
      console.error(`[${catalogTables.stage}] Error:`, stageError)
      return NextResponse.json({ error: getErrorMessage(stageError) }, { status: 500 })
    }

    if (!stage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 })
    }

    const { data: subscription } = await supabaseAdmin
      .from(catalogTables.campusStageMap)
      .select("id")
      .eq(catalogCols.campusStageMap.campusId, campus.id)
      .eq(catalogCols.campusStageMap.stageId, stage.id)
      .eq("is_visible", true)
      .maybeSingle()

    if (!subscription) {
      return NextResponse.json(
        { series: [], campus: { code: campus.code, name: campus.name }, stage: { name: stage.name, display_name: stage.display_name } },
        { status: 200 }
      )
    }

    const { data: rows, error: seriesError } = await supabaseAdmin
      .from(catalogTables.series)
      .select(`
        id,
        name,
        display_name,
        description,
        start_date,
        end_date,
        display_order,
        featured,
        poster_url,
        is_active
      `)
      .eq(catalogCols.series.campusId, campus.id)
      .eq(catalogCols.series.stageId, stage.id)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("start_date", { ascending: false })

    if (seriesError) {
      console.error(`[${catalogTables.series}] Error:`, seriesError)
      return NextResponse.json({ error: getErrorMessage(seriesError) }, { status: 500 })
    }

    const series = (rows || []).map((row) => {
      const normalized = normalizeSeriesRow(row)
      return {
        id: normalized.id,
        name: normalized.name,
        display_name: normalized.display_name,
        description: normalized.description ?? null,
        start_date: normalized.start_date,
        end_date: normalized.end_date,
        display_order: normalized.display_order,
        featured: normalized.featured === true,
        poster_url: normalized.poster_url ?? null,
      }
    })

    console.log(`[${catalogTables.series}] GET /api/public/series campus=${campusCode} stage=${stageName} count=${series.length}`)

    return NextResponse.json(
      {
        campus: { code: campus.code, name: campus.name },
        stage: { name: stage.name, display_name: stage.display_name },
        series,
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    console.error(`[${catalogTables.series}] Error:`, err)
    return NextResponse.json(
      { error: getErrorMessage(err) || "Failed to fetch series" },
      { status: 500 }
    )
  }
}
