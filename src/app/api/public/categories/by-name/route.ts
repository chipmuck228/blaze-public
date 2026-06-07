import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { supabaseAdmin } from "@/lib/supabase"
import { catalogTables } from "@/lib/catalog-db"

/**
 * GET /api/public/categories/by-name?name=beginner_robotics
 * Returns a single v2_category by name (for slug resolution: slug "beginner-robotics" -> name "beginner_robotics").
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get("name")?.trim()
    if (!name) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from(catalogTables.stage)
      .select("id, name, display_name, description, poster_url, is_active, display_order")
      .eq("is_active", true)
      .eq("name", name)
      .maybeSingle()

    if (error) {
      console.error(`[${catalogTables.stage}] Error:`, error)
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (err: unknown) {
    console.error(`[${catalogTables.stage}] Error:`, err)
    return NextResponse.json(
      { error: err instanceof Error ? getErrorMessage(err) : "Failed to fetch category" },
      { status: 500 }
    )
  }
}
