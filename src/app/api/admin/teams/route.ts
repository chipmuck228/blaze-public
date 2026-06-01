import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { getAllTeamMembers, getAllTeamMembersForAdmin, createTeamMember } from "@/lib/db"

export async function GET(request: Request) {
  try {
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

    const teams = await getAllTeamMembersForAdmin()

    return NextResponse.json(teams, { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching teams:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch teams" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
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

    if (!position || !description) {
      return NextResponse.json(
        { error: "Missing required fields: position and description are required" },
        { status: 400 }
      )
    }

    // 如果提供了 user_id，name 和 image_url 是可选的（会使用 Users 表的）
    // 如果没有提供 user_id，name 和 image_url 是必需的（向后兼容）
    if (!user_id && (!name || !image_url)) {
      return NextResponse.json(
        { error: "Missing required fields: either user_id or (name and image_url) are required" },
        { status: 400 }
      )
    }

    const team = await createTeamMember({
      user_id: user_id || undefined,
      image_url: image_url || undefined,
      name: name || undefined,
      position,
      description,
      bio: bio || undefined,
      display_order: display_order || 0,
      is_featured: is_featured ?? false,
      is_active: is_active ?? true,
      social_networks: social_networks || [],
    })

    return NextResponse.json(
      { message: "Team member created successfully", team },
      { status: 201 }
    )
  } catch (error: unknown) {
    console.error("Error creating team member:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to create team member" },
      { status: 500 }
    )
  }
}

