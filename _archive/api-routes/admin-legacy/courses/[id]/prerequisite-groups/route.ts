import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getCoursePrerequisiteGroups,
  createPrerequisiteGroup,
} from "@/lib/db"

// 获取课程的先修课程组
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

    const groups = await getCoursePrerequisiteGroups(id)

    return NextResponse.json({ groups }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching prerequisite groups:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch prerequisite groups" },
      { status: 500 }
    )
  }
}

// 创建先修课程组
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
      group_type,
      min_required,
      display_order,
      description,
      prerequisite_ids,
    } = body

    if (!group_type || !prerequisite_ids || !Array.isArray(prerequisite_ids)) {
      return NextResponse.json(
        { error: "Missing required fields: group_type, prerequisite_ids" },
        { status: 400 }
      )
    }

    const group = await createPrerequisiteGroup(
      id,
      {
        group_type,
        min_required: min_required || 1,
        display_order: display_order || 0,
        description: description || null,
      },
      prerequisite_ids
    )

    return NextResponse.json({ group }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating prerequisite group:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create prerequisite group" },
      { status: 500 }
    )
  }
}

