import { NextResponse } from "next/server"
import { getFranchiseDetailsByCode } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const normalizedCode = decodeURIComponent(code).toLowerCase()

    const franchise = await getFranchiseDetailsByCode(normalizedCode)

    if (!franchise) {
      return NextResponse.json(
        { error: "Franchise not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(franchise, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching franchise details:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch franchise details" },
      { status: 500 }
    )
  }
}

