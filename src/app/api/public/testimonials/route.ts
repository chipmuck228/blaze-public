import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object" && "message" in error) {
    const msg = (error as { message: unknown }).message
    if (typeof msg === "string") return msg
  }
  return String(error)
}

// GET /api/public/testimonials?franchise=code
// All active testimonials on home; with franchise = network-wide OR campuses under that franchise
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const franchiseCode = searchParams.get("franchise")

    let query = supabaseAdmin
      .from("testimonials")
      .select(`
        id,
        user_id,
        campus_id,
        comment,
        display_order,
        user:users(
          id,
          name,
          email,
          image
        )
      `)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })

    if (franchiseCode) {
      const { data: franchise } = await supabaseAdmin
        .from("v2_franchise")
        .select("id")
        .eq("code", franchiseCode.toLowerCase())
        .eq("is_active", true)
        .maybeSingle()

      if (franchise) {
        const { data: campuses } = await supabaseAdmin
          .from("v2_campus")
          .select("id")
          .eq("franchise_id", franchise.id)

        const campusIds = (campuses || []).map((c) => c.id)
        if (campusIds.length > 0) {
          query = query.or(`campus_id.is.null,campus_id.in.(${campusIds.join(",")})`)
        } else {
          query = query.is("campus_id", null)
        }
      } else {
        query = query.is("campus_id", null)
      }
    }

    const { data, error } = await query

    if (error) {
      throw new Error(toErrorMessage(error))
    }

    const rows = data || []
    const campusIds = [
      ...new Set(
        rows
          .map((row) => row.campus_id as string | null)
          .filter((id): id is string => Boolean(id))
      ),
    ]
    const campusById = new Map<string, { id: string; name: string; display_name: string | null }>()
    if (campusIds.length > 0) {
      const { data: campuses, error: campusError } = await supabaseAdmin
        .from("v2_campus")
        .select("id, name, display_name")
        .in("id", campusIds)
      if (campusError) {
        throw new Error(toErrorMessage(campusError))
      }
      for (const c of campuses || []) {
        campusById.set(c.id, c)
      }
    }

    const testimonials = rows.map((testimonial) => {
      const user = Array.isArray(testimonial.user)
        ? testimonial.user[0]
        : testimonial.user
      const campus = testimonial.campus_id
        ? campusById.get(testimonial.campus_id as string)
        : undefined
      return {
        id: testimonial.id,
        user_id: testimonial.user_id,
        name: user?.name || "Anonymous",
        email: user?.email || null,
        image_url: user?.image || null,
        comment: testimonial.comment,
        campus_id: testimonial.campus_id || null,
        location_name: campus ? campus.display_name || campus.name : null,
      }
    })

    return NextResponse.json({ testimonials }, { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching testimonials:", error)
    return NextResponse.json(
      { error: toErrorMessage(error) || "Failed to fetch testimonials" },
      { status: 500 }
    )
  }
}
