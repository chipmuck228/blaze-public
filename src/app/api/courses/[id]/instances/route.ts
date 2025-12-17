import { NextResponse } from "next/server"
import { getCourseInstances, getInstanceAvailableCapacity, getFranchiseByCode, getCourseWithDetails } from "@/lib/db"

// GET: 获取课程的所有可用实例（公开 API，只返回已发布课程的实例）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const franchiseCode = searchParams.get("franchise")

    // 检查课程状态：只有 published 状态的课程可以对外显示实例
    const course = await getCourseWithDetails(id)
    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      )
    }

    if (course.status !== 'published') {
      // 已归档、暂停或草稿状态的课程不对外显示实例
      return NextResponse.json([], { status: 200 })
    }

    let instances = await getCourseInstances(id)

    // 如果指定了 franchise，则按 franchise 过滤实例
    if (franchiseCode) {
      const franchise = await getFranchiseByCode(franchiseCode)
      if (!franchise) {
        return NextResponse.json(
          { error: "Invalid franchise code" },
          { status: 400 }
        )
      }

      instances = instances.filter(
        (instance: any) => instance.franchise_id === franchise.id
      )
    }

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

