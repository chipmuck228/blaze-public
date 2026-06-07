import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import {
  catalogTables,
  catalogCols,
  adminLocationListSelect,
  normalizeLocationRow,
  locationWriteFromBody,
} from "@/lib/catalog-db"

// 获取所有 locations（Admin 称 campus；Web 称 Location）
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const franchiseId = searchParams.get("franchise_id")
    const activeOnly = searchParams.get("activeOnly") === "true"

    let query = supabaseAdmin
      .from(catalogTables.location)
      .select(adminLocationListSelect())
      .order("name", { ascending: true })

    if (activeOnly) {
      query = query.eq("is_active", true)
    }

    if (franchiseId) {
      query = query.eq(catalogCols.location.campusId, franchiseId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch campuses: ${getErrorMessage(error)}`)
    }

    const rows = (data || []).map((row) =>
      normalizeLocationRow(row)
    )
    return NextResponse.json(rows, { status: 200 })
  } catch (error: unknown) {
    console.error("[v3_location] Error fetching campuses:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch campuses" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { franchise_id, name, display_name } = body

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      )
    }

    if (!display_name) {
      return NextResponse.json(
        { error: "Missing required field: display_name" },
        { status: 400 }
      )
    }

    if (!franchise_id) {
      return NextResponse.json(
        { error: "Missing required field: franchise_id" },
        { status: 400 }
      )
    }

    const { data: franchise, error: franchiseError } = await supabaseAdmin
      .from(catalogTables.campus)
      .select("id")
      .eq("id", franchise_id)
      .single()

    if (franchiseError || !franchise) {
      return NextResponse.json(
        { error: "Invalid franchise_id. Campus must exist in catalog." },
        { status: 400 }
      )
    }

    const insertRow = locationWriteFromBody(body)

    const { data, error } = await supabaseAdmin
      .from(catalogTables.location)
      .insert(insertRow)
      .select(adminLocationListSelect())
      .single()

    if (error) {
      console.error("[v3_location] Error creating campus:", error)
      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to create campus" },
        { status: 500 }
      )
    }

    return NextResponse.json(normalizeLocationRow(data), {
      status: 201,
    })
  } catch (error: unknown) {
    console.error("[v3_location] Error creating campus:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to create campus" },
      { status: 500 }
    )
  }
}
