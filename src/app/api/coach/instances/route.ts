import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getCoachInstances } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "coach") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const search = searchParams.get("search")

    let instances = await getCoachInstances(session.user.id)

    // 应用筛选
    if (status) {
      instances = instances.filter(inst => inst.status === status)
    }

    if (startDate) {
      instances = instances.filter(inst => inst.start_date >= startDate)
    }

    if (endDate) {
      instances = instances.filter(inst => inst.end_date <= endDate)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      instances = instances.filter(inst => {
        const courseName = inst.assignment?.course?.name?.toLowerCase() || ""
        const categoryName = inst.assignment?.category?.name?.toLowerCase() || ""
        const seriesName = inst.assignment?.series?.name?.toLowerCase() || ""
        return (
          courseName.includes(searchLower) ||
          categoryName.includes(searchLower) ||
          seriesName.includes(searchLower)
        )
      })
    }

    return NextResponse.json(instances)
  } catch (error: any) {
    console.error("Error fetching coach instances:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch coach instances" },
      { status: 500 }
    )
  }
}

