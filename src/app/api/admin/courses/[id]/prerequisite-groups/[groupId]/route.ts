import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { deletePrerequisiteGroup } from "@/lib/db"

// 删除先修课程组
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  try {
    const { groupId } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await deletePrerequisiteGroup(groupId)

    return NextResponse.json({ message: "Prerequisite group deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting prerequisite group:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete prerequisite group" },
      { status: 500 }
    )
  }
}

