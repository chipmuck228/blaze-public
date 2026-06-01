import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * Public API: 获取所有 featured 的 v2_program。
 * 只返回 is_active = true 且 featured = true 的 program，并带上 franchise 信息。
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("v2_program")
      .select(`
        id,
        name,
        display_name,
        description,
        poster_url,
        display_order,
        franchise:v2_franchise(
          id,
          code,
          name,
          is_active
        )
      `)
      .eq("is_active", true)
      .eq("featured", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    const programs = (data || [])
      .filter((row: any) => row.franchise && row.franchise.is_active !== false)
      .map((row: any) => ({
        id: row.id,
        name: row.name,
        display_name: row.display_name,
        description: row.description ?? null,
        poster_url: row.poster_url ?? null,
        franchise: row.franchise
          ? {
              id: row.franchise.id,
              code: row.franchise.code,
              name: row.franchise.name ?? "",
            }
          : null,
      }))

    return NextResponse.json({ programs }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching featured programs:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch featured programs" },
      { status: 500 }
    )
  }
}
