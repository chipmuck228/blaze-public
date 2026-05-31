import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  deleteTestimonialAdmin,
  getTestimonialAdmin,
  updateTestimonialAdmin,
} from "@/lib/testimonials-admin"

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Something went wrong"
}

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  if (session.user.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 }) }
  }
  return { session }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin()
    if ("error" in authResult && authResult.error) return authResult.error

    const { id } = await params
    const testimonial = await getTestimonialAdmin(id)

    if (!testimonial) {
      return NextResponse.json({ error: "Testimonial not found" }, { status: 404 })
    }

    return NextResponse.json({ testimonial }, { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching testimonial:", error)
    return NextResponse.json(
      { error: toErrorMessage(error) || "Failed to fetch testimonial" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin()
    if ("error" in authResult && authResult.error) return authResult.error

    const { id } = await params
    const body = await request.json()
    const { comment, campus_id, display_order, is_active } = body

    if (!comment?.trim()) {
      return NextResponse.json(
        { error: "Missing required field: quote is required" },
        { status: 400 }
      )
    }

    const testimonial = await updateTestimonialAdmin(id, {
      comment: comment.trim(),
      campus_id: campus_id ?? null,
      display_order: display_order ?? 0,
      is_active: is_active ?? true,
    })

    return NextResponse.json(
      { message: "Testimonial updated successfully", testimonial },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error updating testimonial:", error)
    const message = toErrorMessage(error) || "Failed to update testimonial"
    const status = message === "Testimonial not found" ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAdmin()
    if ("error" in authResult && authResult.error) return authResult.error

    const { id } = await params
    await deleteTestimonialAdmin(id)

    return NextResponse.json(
      { message: "Testimonial deleted successfully" },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error deleting testimonial:", error)
    return NextResponse.json(
      { error: toErrorMessage(error) || "Failed to delete testimonial" },
      { status: 500 }
    )
  }
}
