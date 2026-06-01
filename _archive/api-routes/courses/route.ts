import { NextResponse } from "next/server"
import { getPublishedCourses, getFranchiseByCode } from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase"

// GET /api/courses?franchise=code
// 返回课程列表；如果提供 franchise，则只返回在该 franchise 下有实例的课程
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const franchiseCode = searchParams.get("franchise")

    let courses: any[] = []

    if (franchiseCode) {
      const franchise = await getFranchiseByCode(franchiseCode)
      if (!franchise) {
        return NextResponse.json(
          { error: "Invalid franchise code" },
          { status: 400 }
        )
      }

      // 通过实例 → assignment → course 反向查出在该 franchise 下实际开课的课程
      // 只返回已发布的课程
      const { data, error } = await supabaseAdmin
        .from("course_instances")
        .select(`
          id,
          franchise_id,
          assignment:course_assignments(
            id,
            course:courses!inner(*)
          )
        `)
        .eq("franchise_id", franchise.id)
        .eq("assignment.course.status", "published")

      if (error) {
        throw new Error(error.message)
      }

      const courseMap = new Map<string, any>()
      for (const row of data || []) {
        const course = (row as any).assignment?.course
        if (course && !courseMap.has(course.id)) {
          courseMap.set(course.id, course)
        }
      }

      courses = Array.from(courseMap.values())
    } else {
      // 全局视图：返回所有已发布的课程
      courses = await getPublishedCourses()
    }

    // 映射到前端需要的结构（与 AllCourses 组件的 Course 类型一致）
    const mapped = courses.map((course: any) => {
      // 简单通过课程名推断 type
      let type: "RoboQuest" | "LaunchPad" | "RoboChamps" = "RoboQuest"
      const name = (course.name || "").toLowerCase()
      if (name.includes("launch") || name.includes("pad")) {
        type = "LaunchPad"
      } else if (name.includes("champ") || name.includes("v5")) {
        type = "RoboChamps"
      }

      return {
        id: course.id,
        title: course.name,
        type,
        gradeLevel: course.grade_level || "",
        slug: course.slug || undefined,
        featured: false,
      }
    })

    return NextResponse.json(mapped)
  } catch (error: any) {
    console.error("Error fetching courses:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch courses" },
      { status: 500 }
    )
  }
}


