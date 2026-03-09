import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getCoursePrerequisites,
  createCoursePrerequisite,
  deleteCoursePrerequisite,
  updateCoursePrerequisite,
} from "@/lib/db"

// 获取课程的所有先修课程
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

    const prerequisites = await getCoursePrerequisites(id)

    return NextResponse.json({ prerequisites }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching course prerequisites:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch prerequisites" },
      { status: 500 }
    )
  }
}

// 创建先修课程关系
export async function POST(
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
    const {
      prerequisite_course_id,
      requirement_type,
      is_mandatory,
      display_order,
      notes,
    } = body

    if (!prerequisite_course_id) {
      return NextResponse.json(
        { error: "Missing required field: prerequisite_course_id" },
        { status: 400 }
      )
    }

    const prerequisite = await createCoursePrerequisite(id, prerequisite_course_id, {
      requirement_type: requirement_type || 'required',
      is_mandatory: is_mandatory !== undefined ? is_mandatory : true,
      display_order: display_order || 0,
      notes: notes || null,
    })

    return NextResponse.json({ prerequisite }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating course prerequisite:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create prerequisite" },
      { status: 500 }
    )
  }
}

