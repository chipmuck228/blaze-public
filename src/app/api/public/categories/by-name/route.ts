import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

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
      .from("v2_category")
      .select("id, name, display_name, description, poster_url, is_active, display_order")
      .eq("is_active", true)
      .eq("name", name)
      .maybeSingle()

    if (error) {
      console.error("[Categories by-name API] Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json(data, { status: 200 })
  } catch (err: unknown) {
    console.error("[Categories by-name API] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch category" },
      { status: 500 }
    )
  }
}
