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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from(catalogTables.location)
      .select(adminLocationListSelect())
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Campus not found" }, { status: 404 })
      }
      throw new Error(getErrorMessage(error))
    }

    return NextResponse.json(normalizeLocationRow(data), {
      status: 200,
    })
  } catch (error: unknown) {
    console.error("[v3_location] Error fetching campus:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch campus" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { franchise_id, display_name } = body

    if (!display_name) {
      return NextResponse.json(
        { error: "Missing required field: display_name" },
        { status: 400 }
      )
    }

    if (franchise_id) {
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
    }

    const updateData = {
      ...locationWriteFromBody(body, { isUpdate: true }),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from(catalogTables.location)
      .update(updateData)
      .eq("id", id)
      .select(adminLocationListSelect())
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Campus not found" }, { status: 404 })
      }
      console.error("[v3_location] Error updating campus:", error)
      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to update campus" },
        { status: 500 }
      )
    }

    return NextResponse.json(normalizeLocationRow(data), {
      status: 200,
    })
  } catch (error: unknown) {
    console.error("[v3_location] Error updating campus:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to update campus" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: instances, error: instancesError } = await supabaseAdmin
      .from(catalogTables.session)
      .select("id")
      .eq(catalogCols.session.locationId, id)
      .limit(1)

    if (instancesError) {
      console.error("[v3_session] Error checking sessions:", instancesError)
    }

    if (instances && instances.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete campus. There are instances using this campus." },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from(catalogTables.location)
      .delete()
      .eq("id", id)

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Campus not found" }, { status: 404 })
      }
      console.error("[v3_location] Error deleting campus:", error)
      return NextResponse.json(
        { error: getErrorMessage(error) || "Failed to delete campus" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Campus deleted successfully" }, { status: 200 })
  } catch (error: unknown) {
    console.error("[v3_location] Error deleting campus:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to delete campus" },
      { status: 500 }
    )
  }
}
