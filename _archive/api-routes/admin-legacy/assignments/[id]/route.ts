import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { updateCourseAssignment, deleteCourseAssignment } from "@/lib/db"

// 获取单个分配
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

    const { getAllCourseAssignments } = await import("@/lib/db")
    const assignments = await getAllCourseAssignments()
    const assignment = assignments.find((a) => a.id === id)

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    return NextResponse.json(assignment, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching assignment:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch assignment" },
      { status: 500 }
    )
  }
}

// 更新课程分配
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
    const { category_id, series_id, location_id, display_order, is_active } = body

    const assignment = await updateCourseAssignment(id, {
      category_id,
      series_id,
      location_id,
      display_order,
      is_active,
    })

    return NextResponse.json(assignment, { status: 200 })
  } catch (error: any) {
    console.error("Error updating assignment:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update assignment" },
      { status: 500 }
    )
  }
}

// 删除课程分配（会级联删除所有 Instance）
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

    await deleteCourseAssignment(id)

    return NextResponse.json({ message: "Assignment deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting assignment:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete assignment" },
      { status: 500 }
    )
  }
}

