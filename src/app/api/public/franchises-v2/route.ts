import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * Public API: 获取所有 active 的 v2_franchise。
 * 只返回 is_active = true 的 franchise。
 * 若有 v2_campus，则用第一个 active campus 的 address/city/state/zip_code 作为展示用地址。
 */
export async function GET() {
  try {
    const { data: franchises, error: franchisesError } = await supabaseAdmin
      .from("v2_franchise")
      .select("id, code, name, is_active, poster_url")
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (franchisesError) {
      throw new Error(franchisesError.message)
    }

    if (!franchises || franchises.length === 0) {
      return NextResponse.json([], { status: 200 })
    }

    // 获取每个 franchise 的 campus 列表（用于地址 + 计数）
    const { data: campuses, error: campusesError } = await supabaseAdmin
      .from("v2_campus")
      .select("franchise_id, address, city, state, zip_code")
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (campusesError) {
      console.warn("[v2_campus] Error fetching campuses for franchise addresses:", campusesError)
    }

    const franchiseIdToAddress = new Map<string, { address?: string; city?: string; state?: string; zip_code?: string }>()
    const franchiseIdToCampusCount = new Map<string, number>()
    if (campuses) {
      for (const c of campuses) {
        if (c.franchise_id) {
          if (!franchiseIdToAddress.has(c.franchise_id)) {
            franchiseIdToAddress.set(c.franchise_id, {
              address: c.address ?? undefined,
              city: c.city ?? undefined,
              state: c.state ?? undefined,
              zip_code: c.zip_code ?? undefined,
            })
          }
          franchiseIdToCampusCount.set(c.franchise_id, (franchiseIdToCampusCount.get(c.franchise_id) ?? 0) + 1)
        }
      }
    }

    // Web Program count = visible subscribed v2_category per franchise (not v2_program / Activity)
    const { data: categoryMaps, error: categoryMapsError } = await supabaseAdmin
      .from("v2_franchise_category_map")
      .select(`
        franchise_id,
        category:v2_category!inner(is_active)
      `)
      .eq("is_visible", true)

    if (categoryMapsError) {
      console.warn("[v2_franchise_category_map] Error fetching category subscriptions:", categoryMapsError)
    }

    const franchiseIdToProgramCount = new Map<string, number>()
    if (categoryMaps) {
      for (const row of categoryMaps) {
        const category = Array.isArray(row.category) ? row.category[0] : row.category
        if (row.franchise_id && category?.is_active !== false) {
          franchiseIdToProgramCount.set(
            row.franchise_id,
            (franchiseIdToProgramCount.get(row.franchise_id) ?? 0) + 1
          )
        }
      }
    }

    const result = franchises.map((f: { id: string; code: string; name: string | null; poster_url?: string | null }) => {
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
    console.error("[v2_franchise] Error fetching public franchises:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch franchises" },
      { status: 500 }
    )
  }
}
