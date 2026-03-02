import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

/**
 * Public API: 按 franchise code 获取该 franchise 下所有 active 的 v2_program。
 * 返回 program 列表，含 category 与 featured 标志，用于 Location 页等展示。
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const franchiseCode = searchParams.get("franchise")

    if (!franchiseCode) {
      return NextResponse.json(
        { error: "franchise query parameter is required" },
        { status: 400 }
      )
    }

    const normalizedCode = decodeURIComponent(franchiseCode).toLowerCase()

    const { data: franchise, error: franchiseError } = await supabaseAdmin
      .from("v2_franchise")
      .select("id, code, name, is_active")
      .eq("code", normalizedCode)
      .eq("is_active", true)
      .single()

    if (franchiseError || !franchise) {
      return NextResponse.json(
        { error: "Franchise not found" },
        { status: 404 }
      )
    }

    const { data: programs, error: programsError } = await supabaseAdmin
      .from("v2_program")
      .select(`
        id,
        name,
        display_name,
        description,
        poster_url,
        display_order,
        featured,
        category:v2_category(
          id,
          name,
          display_name,
          description,
          poster_url,
          is_active
        )
      `)
      .eq("franchise_id", franchise.id)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("featured", { ascending: false })
      .order("name", { ascending: true })

    if (programsError) {
      throw new Error(programsError.message)
    }

    const list = (programs || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      display_name: row.display_name,
      description: row.description ?? null,
      poster_url: row.poster_url ?? null,
      display_order: row.display_order ?? 0,
      featured: row.featured === true,
      category: row.category
        ? {
            id: row.category.id,
            name: row.category.name,
            display_name: row.category.display_name,
            description: row.category.description ?? null,
            poster_url: row.category.poster_url ?? null,
            is_active: row.category.is_active,
          }
        : null,
    }))

    return NextResponse.json(list, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching programs v2 by franchise:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch programs" },
      { status: 500 }
    )
  }
}
