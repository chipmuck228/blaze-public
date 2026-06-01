import { NextResponse } from "next/server"
import { getFranchiseByCode, getFranchiseLocations } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const normalizedCode = decodeURIComponent(code).toLowerCase()

    const franchise = await getFranchiseByCode(normalizedCode)

    if (!franchise) {
      return NextResponse.json(
        { error: "Franchise not found" },
        { status: 404 }
      )
    }

    const locations = await getFranchiseLocations(franchise.id)

    return NextResponse.json({ locations }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching franchise locations:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch franchise locations" },
      { status: 500 }
    )
  }
}

