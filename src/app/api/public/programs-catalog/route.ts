import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { supabaseAdmin } from "@/lib/supabase"
import { unwrapRelation } from "@/lib/supabase-relation"
import {
  aggregateSeriesByName,
  countSeriesGroups,
  countUniqueOfferingNames,
  dedupeOfferingsByName,
  mergeOfferingMetadata,
  normalizeOfferingNameKey,
  type ProgramsCatalogCampusRef,
  type ProgramsCatalogLocationRef,
  type ProgramsCatalogOffering,
  type ProgramsCatalogResponse,
  type ProgramsCatalogSeries,
  type ProgramsCatalogStage,
} from "@/lib/programs-catalog-tree"
import {
  catalogCols,
  catalogTables,
  isCatalogV3,
  normalizeSeriesRow,
  seriesFranchiseEmbed,
  sessionLocationEmbed,
} from "@/lib/catalog-db"

type SessionRow = {
  series_id?: string
  program_id?: string
  location_id?: string | null
  campus_id?: string | null
  instance_data_ext?: unknown
  campus?: unknown
  offering?: unknown
}

type SeriesRow = Record<string, unknown>

type StageRow = {
  id: string
  name: string
  display_name: string
  description: string | null
  poster_url: string | null
  display_order: number
}

function resolveCampusCode(searchParams: URLSearchParams): string | null {
  const raw =
    searchParams.get("campus")?.trim() ||
    searchParams.get("location")?.trim() ||
    searchParams.get("franchise")?.trim()
  return raw ? raw.toLowerCase() : null
}

function mapOffering(raw: unknown): ProgramsCatalogOffering | null {
  const row = unwrapRelation(raw as Record<string, unknown> | Record<string, unknown>[] | null)
  if (!row || row.status !== "published") return null

  const offeringType = unwrapRelation(
    row.offering_type as Record<string, unknown> | Record<string, unknown>[] | null
  )

  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    slug: row.slug != null ? String(row.slug) : null,
    description: row.description != null ? String(row.description) : null,
    poster_url: row.poster_url != null ? String(row.poster_url) : null,
    target_audience: row.target_audience != null ? String(row.target_audience) : null,
    offering_type: offeringType
      ? {
          code: String(offeringType.code ?? "").toLowerCase(),
          name: String(offeringType.name ?? offeringType.code ?? ""),
        }
      : null,
    locations: [],
    age_min: null,
    age_max: null,
  }
}

function parseAge(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value
  if (typeof value === "string" && value.trim()) {
    const n = Number(value)
    return Number.isNaN(n) ? null : n
  }
  return null
}

function sessionLocationRef(session: SessionRow): ProgramsCatalogLocationRef | null {
  const loc = unwrapRelation(
    session.campus as Record<string, unknown> | Record<string, unknown>[] | null
  )
  if (!loc?.id) return null
  const name = String(loc.display_name ?? loc.name ?? "").trim()
  if (!name) return null
  return { id: String(loc.id), name }
}

function offeringFromSession(session: SessionRow): ProgramsCatalogOffering | null {
  const base = mapOffering(session.offering)
  if (!base) return null

  const ext =
    session.instance_data_ext && typeof session.instance_data_ext === "object"
      ? (session.instance_data_ext as Record<string, unknown>)
      : null
  const loc = sessionLocationRef(session)

  return {
    ...base,
    locations: loc ? [loc] : [],
    age_min: parseAge(ext?.age_min),
    age_max: parseAge(ext?.age_max),
  }
}

/**
 * GET /api/public/programs-catalog?campus=bellevue
 * Optional campus filter; returns stage → series → offering tree (no sessions).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const campusCode = resolveCampusCode(searchParams)

    let campus: ProgramsCatalogCampusRef | null = null
    let campusId: string | null = null
    let subscribedStageIds: Set<string> | null = null

    if (campusCode) {
      const { data: campusRow, error: campusError } = await supabaseAdmin
        .from(catalogTables.campus)
        .select("id, code, name")
        .eq("code", campusCode)
        .eq("is_active", true)
        .maybeSingle()

      if (campusError) {
        console.error(`[${catalogTables.campus}] Error:`, campusError)
        return NextResponse.json({ error: getErrorMessage(campusError) }, { status: 500 })
      }

      if (!campusRow) {
        return NextResponse.json({ error: "Campus not found" }, { status: 404 })
      }

      campus = { code: campusRow.code, name: campusRow.name }
      campusId = campusRow.id

      const { data: subs, error: subsError } = await supabaseAdmin
        .from(catalogTables.campusStageMap)
        .select(`${catalogCols.campusStageMap.stageId}`)
        .eq(catalogCols.campusStageMap.campusId, campusId)
        .eq("is_visible", true)

      if (subsError) {
        console.error(`[${catalogTables.campusStageMap}] Error:`, subsError)
        return NextResponse.json({ error: getErrorMessage(subsError) }, { status: 500 })
      }

      subscribedStageIds = new Set(
        (subs || []).map((s) => String(s[catalogCols.campusStageMap.stageId as keyof typeof s]))
      )
    }

    const { data: stageRows, error: stageError } = await supabaseAdmin
      .from(catalogTables.stage)
      .select("id, name, display_name, description, poster_url, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true })

    if (stageError) {
      console.error(`[${catalogTables.stage}] Error:`, stageError)
      return NextResponse.json({ error: getErrorMessage(stageError) }, { status: 500 })
    }

    let stages = (stageRows || []) as StageRow[]
    if (subscribedStageIds) {
      stages = stages.filter((s) => subscribedStageIds!.has(s.id))
    }

    if (stages.length === 0) {
      const empty: ProgramsCatalogResponse = {
        campus,
        stats: { stages: 0, series: 0, offerings: 0, locations: 0 },
        filterLocations: [],
        stages: [],
      }
      return NextResponse.json(empty, { status: 200 })
    }

    const stageIds = stages.map((s) => s.id)
    const stageIdSet = new Set(stageIds)

    const campusEmbed = isCatalogV3()
      ? seriesFranchiseEmbed("id, code, name")
      : `franchise:${catalogTables.campus}(id, code, name)`

    let seriesQuery = supabaseAdmin
      .from(catalogTables.series)
      .select(`
        id,
        name,
        display_name,
        description,
        poster_url,
        featured,
        display_order,
        start_date,
        end_date,
        ${catalogCols.series.stageId},
        ${catalogCols.series.campusId},
        ${campusEmbed}
      `)
      .eq("is_active", true)
      .in(catalogCols.series.stageId, stageIds)
      .order("display_order", { ascending: true })
      .order("start_date", { ascending: false })

    if (campusId) {
      seriesQuery = seriesQuery.eq(catalogCols.series.campusId, campusId)
    }

    const { data: seriesRows, error: seriesError } = await seriesQuery

    if (seriesError) {
      console.error(`[${catalogTables.series}] Error:`, seriesError)
      return NextResponse.json({ error: getErrorMessage(seriesError) }, { status: 500 })
    }

    const seriesList = (seriesRows || []).map((row) =>
      normalizeSeriesRow(row as unknown as SeriesRow)
    ) as SeriesRow[]

    if (seriesList.length === 0) {
      const empty: ProgramsCatalogResponse = {
        campus,
        stats: { stages: 0, series: 0, offerings: 0, locations: 0 },
        filterLocations: [],
        stages: [],
      }
      return NextResponse.json(empty, { status: 200 })
    }

    const seriesIds = seriesList.map((s) => String(s.id))
    const seriesIdSet = new Set(seriesIds)

    const seriesIdCol = isCatalogV3() ? "series_id" : "program_id"
    const locationIdCol = catalogCols.session.locationId

    const { data: sessionRows, error: sessionError } = await supabaseAdmin
      .from(catalogTables.session)
      .select(`
        ${seriesIdCol},
        ${locationIdCol},
        instance_data_ext,
        ${sessionLocationEmbed("id, name, display_name")},
        offering:${catalogTables.offering}(
          id,
          name,
          slug,
          description,
          poster_url,
          target_audience,
          status,
          offering_type:${catalogTables.offeringType}(code, name)
        )
      `)
      .in(seriesIdCol, seriesIds)
      .eq("is_active", true)
      .in("status", ["scheduled", "ongoing"])

    if (sessionError) {
      console.error(`[${catalogTables.session}] Error:`, sessionError)
      return NextResponse.json({ error: getErrorMessage(sessionError) }, { status: 500 })
    }

    const offeringsBySeries = new Map<string, Map<string, ProgramsCatalogOffering>>()
    const locationIds = new Set<string>()
    const locationMeta = new Map<string, string>()

    for (const session of (sessionRows || []) as SessionRow[]) {
      const sid = String(session.series_id ?? session.program_id ?? "")
      if (!sid || !seriesIdSet.has(sid)) continue

      const offering = offeringFromSession(session)
      if (!offering) continue

      const locRaw = (session as Record<string, unknown>)[locationIdCol]
      const locId = locRaw != null ? String(locRaw).trim() : ""
      if (locId) {
        locationIds.add(locId)
        for (const loc of offering.locations) {
          locationMeta.set(loc.id, loc.name)
        }
      }

      const nameKey = normalizeOfferingNameKey(offering.name)
      if (!nameKey) continue

      if (!offeringsBySeries.has(sid)) {
        offeringsBySeries.set(sid, new Map())
      }
      const bucket = offeringsBySeries.get(sid)!
      const existing = bucket.get(nameKey)
      if (!existing) {
        bucket.set(nameKey, offering)
      } else {
        bucket.set(nameKey, mergeOfferingMetadata(existing, offering))
      }
    }

    const seriesByStage = new Map<string, ProgramsCatalogSeries[]>()

    for (const raw of seriesList) {
      const stageId = String(raw[catalogCols.series.stageId] ?? raw.category_id ?? "")
      if (!stageIdSet.has(stageId)) continue

      const seriesId = String(raw.id)
      const offeringMap = offeringsBySeries.get(seriesId)
      if (!offeringMap || offeringMap.size === 0) continue

      const franchise = unwrapRelation(
        (raw.franchise ?? raw.campus) as Record<string, unknown> | Record<string, unknown>[] | null
      )

      const campuses: ProgramsCatalogCampusRef[] = []
      if (franchise) {
        campuses.push({
          code: String(franchise.code ?? ""),
          name: String(franchise.name ?? franchise.code ?? ""),
        })
      } else if (campus) {
        campuses.push(campus)
      }

      const entry: ProgramsCatalogSeries = {
        id: seriesId,
        name: String(raw.name ?? ""),
        display_name: String(raw.display_name ?? raw.name ?? ""),
        description: raw.description != null ? String(raw.description) : null,
        poster_url: raw.poster_url != null ? String(raw.poster_url) : null,
        featured: raw.featured === true,
        campuses,
        offerings: dedupeOfferingsByName(Array.from(offeringMap.values())),
      }

      if (!seriesByStage.has(stageId)) {
        seriesByStage.set(stageId, [])
      }
      seriesByStage.get(stageId)!.push(entry)
    }

    const resultStages: ProgramsCatalogStage[] = []

    for (const stage of stages) {
      const rawSeries = seriesByStage.get(stage.id)
      if (!rawSeries || rawSeries.length === 0) continue

      const aggregatedSeries = aggregateSeriesByName(rawSeries)

      resultStages.push({
        id: stage.id,
        name: stage.name,
        display_name: stage.display_name,
        description: stage.description,
        poster_url: stage.poster_url,
        display_order: stage.display_order,
        series: aggregatedSeries,
      })
    }

    const filterLocations: ProgramsCatalogLocationRef[] = Array.from(locationMeta.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))

    const response: ProgramsCatalogResponse = {
      campus,
      stats: {
        stages: resultStages.length,
        series: countSeriesGroups(resultStages),
        offerings: countUniqueOfferingNames(resultStages),
        locations: locationIds.size,
      },
      filterLocations,
      stages: resultStages,
    }

    console.log(
      `[${catalogTables.stage}] GET /api/public/programs-catalog campus=${campusCode ?? "all"} stages=${response.stats.stages} series=${response.stats.series} offerings=${response.stats.offerings} locations=${response.stats.locations}`
    )

    return NextResponse.json(response, { status: 200 })
  } catch (err: unknown) {
    console.error(`[${catalogTables.stage}] programs-catalog error:`, err)
    return NextResponse.json(
      { error: getErrorMessage(err) || "Failed to fetch programs catalog" },
      { status: 500 }
    )
  }
}
