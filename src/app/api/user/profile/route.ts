import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getUserById, updateUser } from "@/lib/db"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const user = await getUserById(session.user.id)

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      email_verified: user.email_verified,
      created_at: user.created_at,
    })
  } catch (error: any) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch user profile" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    const updatedUser = await updateUser(session.user.id, { name })

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      email_verified: updatedUser.email_verified,
      created_at: updatedUser.created_at,
    })
  } catch (error: any) {
    console.error("Error updating user profile:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update user profile" },
      { status: 500 }
    )
  }
}

