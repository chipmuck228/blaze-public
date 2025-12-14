import { NextResponse } from "next/server"
import { getCourseInstances, getInstanceAvailableCapacity } from "@/lib/db"

// GET: 获取课程的所有可用实例
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const instances = await getCourseInstances(id)

    // 获取每个实例的可用容量
    const instancesWithCapacity = await Promise.all(
      instances.map(async (instance) => {
        const availableCapacity = await getInstanceAvailableCapacity(instance.id)
        return {
          ...instance,
          available_capacity: availableCapacity,
          is_full: availableCapacity <= 0,
        }
      })
    )

    // 只返回未来的实例（start_date >= today）
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const futureInstances = instancesWithCapacity.filter(instance => {
      const startDate = new Date(instance.start_date)
      startDate.setHours(0, 0, 0, 0)
      return startDate >= today
    })

    return NextResponse.json(futureInstances)
  } catch (error: any) {
    console.error("Error fetching course instances:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch course instances" },
      { status: 500 }
    )
  }
}

