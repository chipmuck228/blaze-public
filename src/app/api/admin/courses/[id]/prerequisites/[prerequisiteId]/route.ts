import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  updateCoursePrerequisite,
  deleteCoursePrerequisite,
} from "@/lib/db"

// 更新先修课程关系
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; prerequisiteId: string }> }
) {
  try {
    const { prerequisiteId } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      requirement_type,
      is_mandatory,
      display_order,
      notes,
    } = body

    const prerequisite = await updateCoursePrerequisite(prerequisiteId, {
      requirement_type,
      is_mandatory,
      display_order,
      notes,
    })

    return NextResponse.json({ prerequisite }, { status: 200 })
  } catch (error: any) {
    console.error("Error updating course prerequisite:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update prerequisite" },
      { status: 500 }
    )
  }
}

// 删除先修课程关系
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; prerequisiteId: string }> }
) {
  try {
    const { prerequisiteId } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await deleteCoursePrerequisite(prerequisiteId)

    return NextResponse.json({ message: "Prerequisite deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting course prerequisite:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete prerequisite" },
      { status: 500 }
    )
  }
}

