import { NextResponse } from "next/server"
import { getCourseWithDetails } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const course = await getCourseWithDetails(id)

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      )
    }

    // 映射到前端需要的格式
    const mappedCourse = {
      id: course.id,
      name: course.name,
      slug: course.slug,
      description: course.description,
      target_audience: course.target_audience,
      learning_outcomes: course.learning_outcomes,
      prerequisites: course.prerequisites,
      cancellation_policy: course.cancellation_policy,
      base_price: course.base_price,
      duration_hours: course.duration_hours,
      session_count: course.session_count,
      age_min: course.age_min,
      age_max: course.age_max,
      grade_level: course.grade_level,
      subcategories: course.subcategories || [],
      assignments: course.assignments || [],
    }

    return NextResponse.json(mappedCourse)
  } catch (error: any) {
    console.error("Error fetching course details:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch course details" },
      { status: 500 }
    )
  }
}

