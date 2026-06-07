import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { supabaseAdmin } from "@/lib/supabase"
import { catalogTables } from "@/lib/catalog-db"

/**
 * Public API: single franchise by code from v2_franchise (same source as instances-v2).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const normalizedCode = decodeURIComponent(code).toLowerCase()

    const { data: franchise, error } = await supabaseAdmin
      .from(catalogTables.campus)
      .select(
        "id, code, name, domain, logo_url, branding_config, marketing_config, contact_email, contact_phone, address, timezone, locale, is_active, poster_url"
      )
      .eq("code", normalizedCode)
      .eq("is_active", true)
      .maybeSingle()

    if (error) {
      console.error(`[${catalogTables.campus}] Error:`, error)
      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to fetch franchise" },
        { status: 500 }
      )
    }

    if (!franchise) {
      return NextResponse.json({ error: "Franchise not found" }, { status: 404 })
    }

    return NextResponse.json(
      {
        ...franchise,
        primary_domain: franchise.domain ?? null,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error(`[${catalogTables.campus}] Error:`, error)
    return NextResponse.json(
      { error: error instanceof Error ? getErrorMessage(error) : "Failed to fetch franchise" },
      { status: 500 }
    )
  }
}
