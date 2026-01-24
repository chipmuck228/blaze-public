import { NextResponse } from "next/server"
import { getFranchiseV2ByCode } from "@/lib/db-v2"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const normalizedCode = decodeURIComponent(code).toLowerCase()

    const franchise = await getFranchiseV2ByCode(normalizedCode)

    if (!franchise) {
      return NextResponse.json(
        { error: "Franchise not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(franchise, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching franchise v2:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch franchise v2" },
      { status: 500 }
    )
  }
}
