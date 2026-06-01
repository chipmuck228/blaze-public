import { NextResponse } from "next/server"
import { getCourseInstances, getInstanceAvailableCapacity, getFranchiseByCode, getCourseWithDetails } from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase"

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

    // 获取包含完整层级信息的 instances
    const { data: assignmentsData } = await supabaseAdmin
      .from('course_assignments')
      .select('id')
      .eq('course_id', id)
      .eq('is_active', true)

    if (!assignmentsData || assignmentsData.length === 0) {
      return NextResponse.json([])
    }

    const assignmentIds = assignmentsData.map(a => a.id)

    let instancesQuery = supabaseAdmin
      .from('course_instances')
      .select(`
        *,
        assignment:course_assignments(
          id,
          category_id,
          series_id,
          category:course_categories(
            id,
            name,
            display_name
          ),
          series:course_series(
            id,
            name,
            display_name,
            franchise_id,
            franchise:franchises(
              id,
              code,
              name
            )
          )
        ),
        location:course_locations(
          id,
          name,
          address,
          city,
          state,
          zip_code
        )
      `)
      .in('assignment_id', assignmentIds)
      .eq('is_active', true)
      .order('start_date', { ascending: true })
      .order('start_time', { ascending: true })

    // 如果指定了 franchise，则按 franchise 过滤实例
    if (franchiseCode) {
      const franchise = await getFranchiseByCode(franchiseCode)
      if (!franchise) {
        return NextResponse.json(
          { error: "Invalid franchise code" },
          { status: 400 }
        )
      }
      // 先获取所有 instances，然后根据 franchise_id 或 series.franchise_id 过滤
    }

    const { data: instancesData, error: instancesError } = await instancesQuery

    if (instancesError) {
      throw new Error(`Failed to fetch instances: ${instancesError.message}`)
    }

    let instances = (instancesData || []) as any[]

    // 如果指定了 franchise，则按 franchise 过滤实例
    if (franchiseCode) {
      const franchise = await getFranchiseByCode(franchiseCode)
      if (!franchise) {
        return NextResponse.json(
          { error: "Invalid franchise code" },
          { status: 400 }
        )
      }

      instances = instances.filter((instance: any) => {
        // 如果 instance 有 franchise_id，必须匹配
        if (instance.franchise_id !== null && instance.franchise_id !== undefined) {
          return instance.franchise_id === franchise.id
        }
        // 否则从 assignment → series → franchise 推导
        const assignment = Array.isArray(instance.assignment) ? instance.assignment[0] : instance.assignment
        if (assignment?.series) {
          const series = Array.isArray(assignment.series) ? assignment.series[0] : assignment.series
          if (series?.franchise_id) {
            return series.franchise_id === franchise.id
          }
        }
        return false
      })
    }

    // 获取每个实例的可用容量
    const instancesWithCapacity = await Promise.all(
      instances.map(async (instance: any) => {
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

