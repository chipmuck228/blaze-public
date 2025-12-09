import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAllTeamMembers, createTeamMember } from "@/lib/db"

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

    const teams = await getAllTeamMembers()

    return NextResponse.json(teams, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching teams:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch teams" },
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
    const { image_url, name, position, description, display_order, social_networks } = body

    if (!image_url || !name || !position || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const team = await createTeamMember({
      image_url,
      name,
      position,
      description,
      display_order: display_order || 0,
      social_networks: social_networks || [],
    })

    return NextResponse.json(
      { message: "Team member created successfully", team },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Error creating team member:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create team member" },
      { status: 500 }
    )
  }
}

