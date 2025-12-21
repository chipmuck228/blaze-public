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

    // 调试日志：记录查询结果
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Course ${id} Instances] After getCourseInstances:`, {
        instances_count: instances.length,
        instances: instances.map(inst => ({
          id: inst.id,
          assignment_id: inst.assignment_id,
          franchise_id: inst.franchise_id,
          start_date: inst.start_date,
          is_active: inst.is_active,
        })),
        franchise_filter: franchiseCode || 'none',
      })
    }

    // 如果指定了 franchise，则按 franchise 过滤实例
    if (franchiseCode) {
      const franchise = await getFranchiseByCode(franchiseCode)
      if (!franchise) {
        return NextResponse.json(
          { error: "Invalid franchise code" },
          { status: 400 }
        )
      }

      // 过滤逻辑：如果 instance.franchise_id 为 null，需要从 assignment → series 推导
      // 或者允许 franchise_id = null 的实例（表示全局可用）
      instances = instances.filter((instance: any) => {
        // 如果 instance 有 franchise_id，必须匹配
        if (instance.franchise_id !== null && instance.franchise_id !== undefined) {
          return instance.franchise_id === franchise.id
        }
        // 如果 instance.franchise_id 为 null，暂时允许通过（后续可以从 assignment 推导）
        // TODO: 从 assignment → series 推导 franchise_id
        return true
      })
      
      // 调试日志：记录过滤结果
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Course ${id} Instances] After franchise filter:`, {
          franchise_code: franchiseCode,
          franchise_id: franchise.id,
          instances_count: instances.length,
          instances: instances.map(inst => ({
            id: inst.id,
            franchise_id: inst.franchise_id,
          })),
        })
      }
    }

    // 获取每个实例的可用容量
    const instancesWithCapacity = await Promise.all(
      instances.map(async (instance) => {
        const availableCapacity = await getInstanceAvailableCapacity(instance.id)
        const result = {
          ...instance,
          available_capacity: availableCapacity,
          is_full: availableCapacity <= 0,
        }
        
        // 调试日志：记录容量计算详情
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Instance ${instance.id}] Capacity check:`, {
            instance_id: instance.id,
            max_students: instance.max_students,
            current_students: instance.current_students,
            available_capacity: availableCapacity,
            is_full: result.is_full,
            start_date: instance.start_date,
          })
        }
        
        return result
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

    // 调试日志：记录过滤结果
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Course ${id} Instances] Summary:`, {
        total_instances: instances.length,
        instances_with_capacity: instancesWithCapacity.length,
        future_instances: futureInstances.length,
        all_full: futureInstances.length > 0 && futureInstances.every(inst => inst.is_full),
        instances_detail: futureInstances.map(inst => ({
          id: inst.id,
          start_date: inst.start_date,
          available_capacity: inst.available_capacity,
          is_full: inst.is_full,
          max_students: inst.max_students,
        })),
      })
    }

    return NextResponse.json(futureInstances)
  } catch (error: any) {
    console.error("Error fetching course instances:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch course instances" },
      { status: 500 }
    )
  }
}

