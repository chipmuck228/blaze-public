import { NextResponse } from "next/server"
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
      console.warn("Error fetching campuses for franchise addresses:", campusesError)
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

    // 获取每个 franchise 的 active program 数量
    const { data: programs, error: programsError } = await supabaseAdmin
      .from("v2_program")
      .select("franchise_id")
      .eq("is_active", true)

    if (programsError) {
      console.warn("Error fetching programs for franchise counts:", programsError)
    }

    const franchiseIdToProgramCount = new Map<string, number>()
    if (programs) {
      for (const p of programs) {
        if (p.franchise_id) {
          franchiseIdToProgramCount.set(p.franchise_id, (franchiseIdToProgramCount.get(p.franchise_id) ?? 0) + 1)
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
  } catch (error: any) {
    console.error("Error fetching public franchises v2:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch franchises" },
      { status: 500 }
    )
  }
}
