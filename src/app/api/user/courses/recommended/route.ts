import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import {
  getPublishedCourses,
  getUserCompletedCourseIds,
  checkUserPrerequisites,
  getUserEnrollments,
} from "@/lib/db"

// 智能推荐课程（基于用户完成情况、先修条件、兴趣）
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // 获取用户已完成的课程
    const completedCourseIds = await getUserCompletedCourseIds(userId)

    // 获取用户当前注册的课程（了解用户兴趣）
    const enrollments = await getUserEnrollments(userId)
    const activeCourseIds = new Set(
      enrollments
        .filter(e => e.status === 'enrolled' || e.status === 'reserved')
        .map(e => e.instance?.assignment?.course_id)
        .filter(Boolean) as string[]
    )

    // 获取所有已发布的课程
    const allCourses = await getPublishedCourses()

    // 计算每个课程的推荐分数
    const coursesWithScore = await Promise.all(
      allCourses.map(async (course) => {
        // 跳过已完成的课程
        if (completedCourseIds.has(course.id)) {
          return null
        }

        // 检查先修条件
        const prereqCheck = await checkUserPrerequisites(userId, course.id)

        // 如果无法注册（先修条件不满足），降低推荐分数
        if (!prereqCheck.canEnroll) {
          return {
            course,
            score: 0,
            canEnroll: false,
            missingPrerequisites: prereqCheck.missingPrerequisites,
            reasons: [],
          }
        }

        // 计算推荐分数
        let score = 50 // 基础分数

        // 1. 先修条件满足度（如果满足所有先修条件，加分）
        if (prereqCheck.missingPrerequisites.length === 0) {
          score += 30
        }

        // 2. 推荐课程匹配度（如果有推荐课程，加分）
        if (prereqCheck.recommendations && prereqCheck.recommendations.length > 0) {
          const hasRecommendedPrereq = prereqCheck.recommendations.some(r => 
            completedCourseIds.has(r.id)
          )
          if (hasRecommendedPrereq) {
            score += 10
          }
        }

        // 3. 兴趣匹配度（用户当前学习的课程是否与推荐课程相关）
        // 简化处理：如果用户有活跃注册，给予基础兴趣分
        if (activeCourseIds.size > 0) {
          score += 5
        }

        // 4. 难度匹配度（基于用户已完成课程数量）
        if (completedCourseIds.size === 0) {
          // 新用户：推荐入门课程
          if (course.target_grades && course.target_grades.includes('K')) {
            score += 10
          }
        } else {
          // 有经验的用户：可以推荐更高级的课程
          score += 5
        }

        // 生成推荐理由
        const reasons: string[] = []
        if (prereqCheck.missingPrerequisites.length === 0) {
          reasons.push("Prerequisites met")
        }
        if (prereqCheck.recommendations && prereqCheck.recommendations.length > 0) {
          reasons.push("Recommended follow-up")
        }
        if (completedCourseIds.size === 0) {
          reasons.push("Great for beginners")
        } else {
          reasons.push("Next step in your journey")
        }

        return {
          course,
          score: Math.min(100, score),
          canEnroll: true,
          missingPrerequisites: [],
          reasons,
        }
      })
    )

    // 过滤掉 null 值，按分数排序
    const recommended = coursesWithScore
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter(item => item.score > 0) // 只返回有推荐价值的课程
      .sort((a, b) => b.score - a.score)
      .slice(0, 12) // 返回前 12 个推荐

    return NextResponse.json({
      recommended,
      totalCourses: allCourses.length,
    }, { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching recommended courses:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch recommended courses" },
      { status: 500 }
    )
  }
}

