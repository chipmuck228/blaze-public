import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { getUserById, updateUser } from "@/lib/db"
import { isValidUSPhone, formatUSPhoneForStorage } from "@/lib/phone"

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
      phone: user.phone ?? "",
      image: user.image ?? null,
      created_at: user.created_at,
    })
  } catch (error: unknown) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch user profile" },
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
    const { name, phone, image } = body

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    if (phone !== undefined && phone !== null && phone !== "") {
      if (!isValidUSPhone(phone)) {
        return NextResponse.json(
          { error: "Invalid US phone number. Use 10 digits, e.g. (425) 555-0123" },
          { status: 400 }
        )
      }
    }

    const updates: { name: string; phone?: string | null; image?: string | null } = { name }
    if (phone !== undefined) updates.phone = phone === "" ? null : formatUSPhoneForStorage(phone)
    if (image !== undefined) updates.image = image === "" ? null : image

    const updatedUser = await updateUser(session.user.id, updates)

    return NextResponse.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      email_verified: updatedUser.email_verified,
      phone: updatedUser.phone ?? "",
      image: updatedUser.image ?? null,
      created_at: updatedUser.created_at,
    })
  } catch (error: unknown) {
    console.error("Error updating user profile:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to update user profile" },
      { status: 500 }
    )
  }
}

