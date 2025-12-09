import { NextResponse } from "next/server"
import { getAllTeamMembers } from "@/lib/db"

export async function GET(request: Request) {
  try {
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

