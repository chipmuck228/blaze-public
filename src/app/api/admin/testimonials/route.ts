import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  createTestimonialAdmin,
  listTestimonialsAdmin,
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

export async function GET() {
  try {
    const authResult = await requireAdmin()
    if ("error" in authResult && authResult.error) return authResult.error

    const testimonials = await listTestimonialsAdmin()
    return NextResponse.json({ testimonials }, { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching admin testimonials:", error)
    return NextResponse.json(
      { error: toErrorMessage(error) || "Failed to fetch testimonials" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin()
    if ("error" in authResult && authResult.error) return authResult.error

    const body = await request.json()
    const { user_id, comment, campus_id, display_order, is_active } = body

    if (!user_id?.trim() || !comment?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields: user and quote are required" },
        { status: 400 }
      )
    }

    const testimonial = await createTestimonialAdmin({
      user_id: user_id.trim(),
      comment: comment.trim(),
      campus_id: campus_id || null,
      display_order: display_order ?? 0,
      is_active: is_active ?? true,
    })

    return NextResponse.json(
      { message: "Testimonial created successfully", testimonial },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error("Error creating testimonial:", error)
    return NextResponse.json(
      { error: toErrorMessage(error) || "Failed to create testimonial" },
      { status: 500 }
    )
  }
}
