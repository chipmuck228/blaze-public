import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  createTestimonialAdmin,
  listTestimonialsAdmin,
} from "@/lib/testimonials-admin"

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
    const message = error instanceof Error ? error.message : "Failed to fetch testimonials"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireAdmin()
    if ("error" in authResult && authResult.error) return authResult.error

    const body = await request.json()
    const { name, email, image_url, comment, franchise_id, display_order, is_active } = body

    if (!name?.trim() || !comment?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields: name and comment are required" },
        { status: 400 }
      )
    }

    const testimonial = await createTestimonialAdmin({
      name: name.trim(),
      email: email?.trim() || null,
      image_url: image_url || null,
      comment: comment.trim(),
      franchise_id: franchise_id || null,
      display_order: display_order ?? 0,
      is_active: is_active ?? true,
      created_by: authResult.session!.user.id,
    })

    return NextResponse.json(
      { message: "Testimonial created successfully", testimonial },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error("Error creating testimonial:", error)
    const message = error instanceof Error ? error.message : "Failed to create testimonial"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
