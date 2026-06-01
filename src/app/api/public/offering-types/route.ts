import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { supabaseAdmin } from "@/lib/supabase"

/** GET /api/public/offering-types — active v2_offering_type rows for C-end filters */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("v2_offering_type")
      .select("id, code, name, description, icon, color, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true })

    if (error) {
      throw new Error(getErrorMessage(error))
    }

    return NextResponse.json({ offering_types: data || [] }, { status: 200 })
  } catch (error: unknown) {
    console.error("[v2_offering_type] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? getErrorMessage(error) : "Failed to fetch offering types" },
      { status: 500 }
    )
  }
}
