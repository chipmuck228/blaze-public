import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getAllCourseAssignments,
  getCourseAssignmentsBySeries,
  createCourseAssignment,
} from "@/lib/db"

// 获取所有课程分配（支持按 series 过滤）
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const seriesId = searchParams.get("seriesId")
    const categoryId = searchParams.get("categoryId")

    if (seriesId) {
      const assignments = await getCourseAssignmentsBySeries(seriesId)
      return NextResponse.json(assignments, { status: 200 })
    }

    // 获取所有分配
    const assignments = await getAllCourseAssignments()

    // 如果提供了 categoryId，进行过滤
    let filteredAssignments = assignments
    if (categoryId) {
      filteredAssignments = assignments.filter(
        (a) => a.category_id === categoryId
      )
    }

    return NextResponse.json(filteredAssignments, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching assignments:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch assignments" },
      { status: 500 }
    )
  }
}

// 创建新课程分配
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { course_id, category_id, series_id, location_id, display_order } = body

    if (!course_id || !category_id || !series_id) {
      return NextResponse.json(
        { error: "Missing required fields: course_id, category_id, series_id" },
        { status: 400 }
      )
    }

    const assignment = await createCourseAssignment({
      course_id,
      category_id,
      series_id,
      location_id,
      display_order: display_order || 0,
      is_active: true,
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error: any) {
    console.error("Error creating assignment:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create assignment" },
      { status: 500 }
    )
  }
}

