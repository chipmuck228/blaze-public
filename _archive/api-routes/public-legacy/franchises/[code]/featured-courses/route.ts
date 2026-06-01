import { NextResponse } from "next/server"
import { getFranchiseByCode, getFranchiseFeaturedCourses } from "@/lib/db"

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

    // 从查询参数获取 limit（可选，默认 6）
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "6", 10)

    const courses = await getFranchiseFeaturedCourses(franchise.id, limit)

    return NextResponse.json({ courses }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching franchise featured courses:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch franchise featured courses" },
      { status: 500 }
    )
  }
}

