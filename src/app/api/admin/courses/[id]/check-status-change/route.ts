import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getCourseWithDetails } from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase"

// 检查课程状态变更的影响
// GET /api/admin/courses/[id]/check-status-change?newStatus=suspended
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const newStatus = searchParams.get("newStatus") as 'draft' | 'published' | 'suspended' | 'archived' | null

    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!newStatus) {
      return NextResponse.json(
        { error: "newStatus parameter is required" },
        { status: 400 }
      )
    }

    const course = await getCourseWithDetails(id)
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    const currentStatus = course.status

    // 如果状态没有变化，不需要检查
    if (currentStatus === newStatus) {
      return NextResponse.json({
        canChange: true,
        warnings: [],
        activeInstances: 0,
        activeEnrollments: 0,
      })
    }

    // 只有从 published 改为 suspended 或 archived 时才需要检查
    if (currentStatus !== 'published' || (newStatus !== 'suspended' && newStatus !== 'archived')) {
      return NextResponse.json({
        canChange: true,
        warnings: [],
        activeInstances: 0,
        activeEnrollments: 0,
      })
    }

    // 检查活跃的 instances
    // 通过 assignments 找到所有相关的 instances
    const assignmentIds = course.assignments?.map(a => a.id) || []
    
    let activeInstancesCount = 0
    let activeInstances: any[] = []
    
    if (assignmentIds.length > 0) {
      const { data: instances, error: instancesError } = await supabaseAdmin
        .from('course_instances')
        .select('id, start_date, end_date, assignment_id')
        .in('assignment_id', assignmentIds)
        .eq('is_active', true)

      if (!instancesError && instances) {
        // 检查是否是未来的实例（start_date >= today）或正在进行的实例
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        activeInstances = instances.filter(instance => {
          const startDate = new Date(instance.start_date)
          startDate.setHours(0, 0, 0, 0)
          const endDate = instance.end_date ? new Date(instance.end_date) : null
          if (endDate) {
            endDate.setHours(23, 59, 59, 999)
          }
          
          // 未来的实例或正在进行的实例（end_date >= today）
          return startDate >= today || (endDate && endDate >= today)
        })
        
        activeInstancesCount = activeInstances.length
      }
    }

    // 检查活跃的 enrollments
    // 通过 instances 找到所有相关的 enrollments
    const instanceIds = activeInstances.map(i => i.id)
    
    let activeEnrollmentsCount = 0
    
    if (instanceIds.length > 0) {
      const now = new Date().toISOString()
      const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
        .from('course_enrollments')
        .select('id, status, instance_id, cart_expires_at, reserved_expires_at')
        .in('instance_id', instanceIds)
        .in('status', ['cart', 'reserved', 'enrolled', 'waitlisted'])

      if (!enrollmentsError && enrollments) {
        // 过滤掉过期的 cart 和 reserved
        activeEnrollmentsCount = enrollments.filter(e => {
          if (e.status === 'cart' && e.cart_expires_at) {
            return new Date(e.cart_expires_at) > new Date(now)
          }
          if (e.status === 'reserved' && e.reserved_expires_at) {
            return new Date(e.reserved_expires_at) > new Date(now)
          }
          // enrolled 和 waitlisted 总是活跃的
          return true
        }).length
      }
    }

    // 构建警告信息
    const warnings: string[] = []
    
    if (activeInstancesCount > 0) {
      warnings.push(`${activeInstancesCount} active instance(s) will be affected`)
    }
    
    if (activeEnrollmentsCount > 0) {
      warnings.push(`${activeEnrollmentsCount} active enrollment(s) will be affected`)
    }

    if (newStatus === 'suspended') {
      warnings.push("This course will be removed from public pages")
      warnings.push("New assignments and instances cannot be created")
      if (activeInstancesCount > 0 || activeEnrollmentsCount > 0) {
        warnings.push("Existing instances and enrollments will continue, but users may not be able to view course details")
      }
    }

    if (newStatus === 'archived') {
      warnings.push("This course will be permanently removed from public pages")
      warnings.push("New assignments and instances cannot be created")
      if (activeInstancesCount > 0 || activeEnrollmentsCount > 0) {
        warnings.push("Existing instances and enrollments will continue for historical records")
      }
    }

    // 允许变更，但显示警告
    return NextResponse.json({
      canChange: true,
      warnings,
      activeInstances: activeInstancesCount,
      activeEnrollments: activeEnrollmentsCount,
      currentStatus,
      newStatus,
    })
  } catch (error: any) {
    console.error("Error checking status change:", error)
    return NextResponse.json(
      { error: error.message || "Failed to check status change" },
      { status: 500 }
    )
  }
}

