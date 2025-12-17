import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { updateUser, deleteUser } from "@/lib/db"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden. Admin access required." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, email, email_verified, role } = body

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (email !== undefined) updates.email = email
    if (email_verified !== undefined) updates.email_verified = email_verified
    if (role !== undefined) updates.role = role

    const user = await updateUser(id, updates)

    return NextResponse.json(
      { message: "User updated successfully", user },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden. Admin access required." },
        { status: 403 }
      )
    }

    // 防止删除自己
    if (session.user.id === id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      )
    }

    const result = await deleteUser(id)

    let message = "User deleted successfully"
    if (result.deletedTeamsCount > 0) {
      message += `. ${result.deletedTeamsCount} associated team profile(s) were also deleted due to CASCADE constraint.`
    }

    return NextResponse.json(
      { 
        message,
        deletedTeamsCount: result.deletedTeamsCount,
        deletedTeams: result.deletedTeams,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete user" },
      { status: 500 }
    )
  }
}

