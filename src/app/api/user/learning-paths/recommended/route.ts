import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getAllLearningPaths, getUserCompletedCourseIds, getUserEnrollments } from "@/lib/db"

// 智能推荐算法：基于用户完成情况、难度、兴趣、学习路径匹配度
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 获取用户已完成的课程
    const completedCourseIds = await getUserCompletedCourseIds(session.user.id)
    
    // 获取用户当前注册的课程（了解用户兴趣）
    const activeEnrollments = await getUserEnrollments(session.user.id)
    const activeCourseIds = new Set(
      activeEnrollments
        .filter(e => e.status === 'enrolled' || e.status === 'reserved')
        .map(e => e.instance?.assignment?.course_id)
        .filter(Boolean) as string[]
    )

    // 获取所有活跃的学习路径
    const allPaths = await getAllLearningPaths({ is_active: true })

    // 计算每个路径的推荐分数
    const pathsWithScore = allPaths.map(path => {
      if (!path.courses || path.courses.length === 0) {
        return { 
          path, 
          score: 0, 
          completedCourses: 0, 
          totalCourses: 0,
          completionRate: 0,
          isCompleted: false,
          canStart: false,
          reasons: [],
        }
      }

      const requiredCourses = path.courses.filter(c => c.is_required)
      const completedRequired = requiredCourses.filter(c => 
        c.course_id && completedCourseIds.has(c.course_id)
      )

      // 计算基础完成度
      const completionRate = requiredCourses.length > 0
        ? completedRequired.length / requiredCourses.length
        : 0

      // 计算兴趣匹配度（用户当前学习的课程是否与路径相关）
      const interestMatch = path.courses.some(c => 
        c.course_id && activeCourseIds.has(c.course_id)
      ) ? 0.2 : 0

      // 计算难度匹配度（如果用户已完成类似难度的课程）
      let difficultyMatch = 0
      if (path.difficulty_level) {
        // 简化处理：如果用户有完成记录，假设可以处理该难度
        if (completedCourseIds.size > 0) {
          difficultyMatch = 0.1
        }
      }

      // 计算路径完整性（路径是否完整，课程数量是否合理）
      const pathCompleteness = requiredCourses.length >= 3 ? 0.1 : 0

      // 计算是否可以开始（没有先修要求或已满足）
      const canStart = completedRequired.length === 0
      const canStartBonus = canStart ? 0.3 : 0

      // 计算进度奖励（如果已经开始，给予额外分数）
      const progressBonus = completionRate > 0 && completionRate < 1 ? 0.2 : 0

      // 综合分数（0-100）
      const score = Math.round(
        (completionRate * 30) + 
        (interestMatch * 100) + 
        (difficultyMatch * 100) + 
        (pathCompleteness * 100) + 
        (canStartBonus * 100) + 
        (progressBonus * 100)
      )

      // 生成推荐理由
      const reasons: string[] = []
      if (canStart) {
        reasons.push("Ready to start")
      }
      if (completionRate > 0 && completionRate < 1) {
        reasons.push(`${Math.round(completionRate * 100)}% complete`)
      }
      if (interestMatch > 0) {
        reasons.push("Matches your current interests")
      }
      if (path.difficulty_level) {
        reasons.push(`${path.difficulty_level.charAt(0).toUpperCase() + path.difficulty_level.slice(1)} level`)
      }
      if (requiredCourses.length >= 5) {
        reasons.push("Comprehensive path")
      }

      return {
        path,
        score: Math.min(100, score), // 限制在 0-100
        completedCourses: completedRequired.length,
        totalCourses: requiredCourses.length,
        completionRate: Math.round(completionRate * 100),
        isCompleted: completedRequired.length === requiredCourses.length && requiredCourses.length > 0,
        canStart,
        reasons,
      }
    })

    // 排序：按分数降序，然后按完成度
    const recommended = pathsWithScore
      .filter(p => p.score > 0 || p.canStart) // 只返回有推荐价值的路径
      .sort((a, b) => {
        // 优先显示可以开始的路径
        if (a.canStart && !b.canStart) return -1
        if (!a.canStart && b.canStart) return 1
        // 然后按分数排序
        if (b.score !== a.score) return b.score - a.score
        // 最后按完成度排序
        return (b.completionRate ?? 0) - (a.completionRate ?? 0)
      })
      .slice(0, 10) // 只返回前 10 个推荐

    return NextResponse.json({ 
      recommended,
      totalPaths: allPaths.length,
    }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching recommended learning paths:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch recommended paths" },
      { status: 500 }
    )
  }
}

