import { NextResponse } from "next/server"
import {getErrorMessage, type StringKeyRecord} from "@/lib/typed-error"
import { auth } from "@/auth"
import { updateTeamMember, deleteTeamMember } from "@/lib/db"

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
    const { 
      user_id,
      image_url, 
      name, 
      position, 
      description, 
      bio,
      display_order, 
      is_featured,
      is_active,
      social_networks 
    } = body

    const updates: StringKeyRecord = {}
    if (user_id !== undefined) updates.user_id = user_id
    if (image_url !== undefined) updates.image_url = image_url
    if (name !== undefined) updates.name = name
    if (position !== undefined) updates.position = position
    if (description !== undefined) updates.description = description
    if (bio !== undefined) updates.bio = bio
    if (display_order !== undefined) updates.display_order = display_order
    if (is_featured !== undefined) updates.is_featured = is_featured
    if (is_active !== undefined) updates.is_active = is_active
    if (social_networks !== undefined) updates.social_networks = social_networks

    const team = await updateTeamMember(id, updates)

    return NextResponse.json(
      { message: "Team member updated successfully", team },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error updating team member:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to update team member" },
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

    await deleteTeamMember(id)

    return NextResponse.json(
      { message: "Team member deleted successfully" },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error deleting team member:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to delete team member" },
      { status: 500 }
    )
  }
}

