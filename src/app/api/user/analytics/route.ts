import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getUserCourseCompletions,
  getUserLearningPathProgress,
  getUserCompletedCourseIds,
  getUserEnrollments,
} from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase"

// 获取用户学习分析报告
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // 1. 获取用户完成的课程
    const completions = await getUserCourseCompletions(userId)
    const completedCourseIds = await getUserCompletedCourseIds(userId)

    // 2. 获取用户的学习路径进度
    const pathProgress = await getUserLearningPathProgress(userId)

    // 3. 获取用户当前注册的课程
    const enrollments = await getUserEnrollments(userId)

    // 4. 计算统计数据
    const totalCompleted = completions.length
    const totalEnrolled = enrollments.filter(e => 
      e.status === 'enrolled' || e.status === 'reserved'
    ).length
    const totalInProgress = enrollments.filter(e => 
      e.status === 'enrolled'
    ).length

    // 5. 按月份统计完成情况
    const completionsByMonth: Record<string, number> = {}
    completions.forEach(c => {
      const month = new Date(c.completion_date).toISOString().slice(0, 7) // YYYY-MM
      completionsByMonth[month] = (completionsByMonth[month] || 0) + 1
    })

    // 6. 获取最常学习的课程类别
    const { data: categoryData } = await supabaseAdmin
      .from('course_enrollments')
      .select(`
        instance_id,
        course_instances!inner(
          assignment_id,
          course_assignments!inner(
            course_id,
            category_id,
            category:course_categories(display_name, name)
          )
        )
      `)
      .eq('user_id', userId)
      .in('status', ['enrolled', 'completed'])

    const categoryCounts: Record<string, { count: number; name: string }> = {}
    if (categoryData) {
      categoryData.forEach((item: any) => {
        const instance = item.course_instances
        const assignment = instance?.course_assignments
        const category = assignment?.category
        if (category && assignment?.category_id) {
          const catId = assignment.category_id
          if (!categoryCounts[catId]) {
            categoryCounts[catId] = {
              count: 0,
              name: category.display_name || category.name || 'Unknown',
            }
          }
          categoryCounts[catId].count++
        }
      })
    }

    const topCategories = Object.entries(categoryCounts)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // 7. 计算学习路径统计
    const pathStats = pathProgress.map(p => ({
      pathId: p.path_id,
      pathName: (p.path as any)?.name || 'Unknown Path',
      progress: p.is_completed ? 100 : Math.round(
        (p.completed_courses_count / p.total_courses_count) * 100
      ),
      completedCourses: p.completed_courses_count,
      totalCourses: p.total_courses_count,
      startedAt: p.started_at,
      completedAt: p.completed_at,
      isCompleted: p.is_completed,
    }))

    // 8. 计算平均完成时间（如果有完成记录）
    let averageCompletionDays: number | null = null
    if (completions.length > 0) {
      const completionDates = completions
        .map(c => new Date(c.completion_date).getTime())
        .sort((a, b) => a - b)
      
      if (completionDates.length > 1) {
        const totalDays = completionDates[completionDates.length - 1] - completionDates[0]
        averageCompletionDays = Math.round(totalDays / (completionDates.length - 1) / (1000 * 60 * 60 * 24))
      }
    }

    // 9. 计算学习强度（最近30天的活动）
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentCompletions = completions.filter(c => 
      new Date(c.completion_date) >= thirtyDaysAgo
    ).length

    const recentEnrollments = enrollments.filter(e => 
      new Date(e.created_at) >= thirtyDaysAgo
    ).length

    const learningIntensity = {
      recentCompletions,
      recentEnrollments,
      totalActivity: recentCompletions + recentEnrollments,
    }

    return NextResponse.json({
      summary: {
        totalCompleted,
        totalEnrolled,
        totalInProgress,
        totalPaths: pathProgress.length,
        completedPaths: pathProgress.filter(p => p.is_completed).length,
      },
      completionsByMonth,
      topCategories,
      pathStats,
      learningIntensity,
      averageCompletionDays,
      lastUpdated: new Date().toISOString(),
    }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching user analytics:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}

