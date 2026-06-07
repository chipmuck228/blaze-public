import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { supabaseAdmin } from "@/lib/supabase"
import { campusPublicSelect, catalogCols, catalogFrom, catalogTables, isMissingPosterUrlColumnError } from "@/lib/catalog-db"

/**
 * Public API: 获取所有 active 的 v2_franchise。
 * 只返回 is_active = true 的 franchise。
 * 若有 v2_campus，则用第一个 active campus 的 address/city/state/zip_code 作为展示用地址。
 */
export async function GET() {
  try {
    let { data: franchises, error: franchisesError } = await catalogFrom("campus")
      .select(campusPublicSelect(true))
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (franchisesError && isMissingPosterUrlColumnError(franchisesError)) {
      console.warn(
        `[${catalogTables.campus}] poster_url column missing — run v3/16_v3_poster_url_columns.sql in Supabase SQL Editor`
      )
      ;({ data: franchises, error: franchisesError } = await catalogFrom("campus")
        .select(campusPublicSelect(false))
        .eq("is_active", true)
        .order("name", { ascending: true }))
    }

    if (franchisesError) {
      throw new Error(franchisesError.message)
    }

    if (!franchises || franchises.length === 0) {
      return NextResponse.json([], { status: 200 })
    }

    // 获取每个 franchise 的 campus 列表（用于地址 + 计数）
    const campusFk = catalogCols.location.campusId
    const mapCampusFk = catalogCols.campusStageMap.campusId

    const { data: campuses, error: campusesError } = await catalogFrom("location")
      .select(`${campusFk}, address, city, state, zip_code`)
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (campusesError) {
      console.warn(`[${catalogTables.location}] Error fetching campuses for franchise addresses:`, campusesError)
    }

    const franchiseIdToAddress = new Map<string, { address?: string; city?: string; state?: string; zip_code?: string }>()
    const franchiseIdToCampusCount = new Map<string, number>()
    if (campuses) {
      for (const c of campuses) {
        const parentCampusId = c[campusFk as keyof typeof c] as string | undefined
        if (parentCampusId) {
          if (!franchiseIdToAddress.has(parentCampusId)) {
            franchiseIdToAddress.set(parentCampusId, {
              address: c.address ?? undefined,
              city: c.city ?? undefined,
              state: c.state ?? undefined,
              zip_code: c.zip_code ?? undefined,
            })
          }
          franchiseIdToCampusCount.set(parentCampusId, (franchiseIdToCampusCount.get(parentCampusId) ?? 0) + 1)
        }
      }
    }

    // Web Program count = visible subscribed stage per campus (not series / Activity)
    const { data: categoryMaps, error: categoryMapsError } = await catalogFrom("campusStageMap")
      .select(`
        ${mapCampusFk},
        category:${catalogTables.stage}!inner(is_active)
      `)
      .eq("is_visible", true)

    if (categoryMapsError) {
      console.warn(`[${catalogTables.campusStageMap}] Error fetching category subscriptions:`, categoryMapsError)
    }

    const franchiseIdToProgramCount = new Map<string, number>()
    if (categoryMaps) {
      for (const row of categoryMaps) {
        const category = Array.isArray(row.category) ? row.category[0] : row.category
        const parentCampusId = row[mapCampusFk as keyof typeof row] as unknown as string | undefined
        if (parentCampusId && category?.is_active !== false) {
          franchiseIdToProgramCount.set(
            parentCampusId,
            (franchiseIdToProgramCount.get(parentCampusId) ?? 0) + 1
          )
        }
      }
    }

    const franchiseRows = (franchises || []) as Array<{
      id: string
      code: string
      name: string | null
      poster_url?: string | null
    }>
    const result = franchiseRows.map((f) => {
      const addr = franchiseIdToAddress.get(f.id)
      return {
        id: f.id,
        code: f.code,
        name: f.name ?? "",
        poster_url: f.poster_url ?? null,
        address: addr?.address,
        city: addr?.city,
        state: addr?.state,
        zip_code: addr?.zip_code,
        program_count: franchiseIdToProgramCount.get(f.id) ?? 0,
        campus_count: franchiseIdToCampusCount.get(f.id) ?? 0,
      }
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error: unknown) {
    console.error(`[${catalogTables.campus}] Error fetching public franchises:`, error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch franchises" },
      { status: 500 }
    )
  }
}
