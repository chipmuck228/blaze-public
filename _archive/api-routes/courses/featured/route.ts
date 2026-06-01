import { NextResponse } from "next/server"
import { getAllCourses, getFranchiseByCode } from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const franchiseCode = searchParams.get("franchise")
    let featuredCourses

    if (franchiseCode) {
      // 如果指定了 franchise，则基于该 franchise 的实例来挑选课程
      const franchise = await getFranchiseByCode(franchiseCode)
      if (!franchise) {
        return NextResponse.json(
          { error: "Invalid franchise code" },
          { status: 400 }
        )
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // 先获取该 franchise 下的所有实例
      const { data: instances, error: instancesError } = await supabaseAdmin
        .from("course_instances")
        .select(`
          id,
          franchise_id,
          start_date,
          assignment_id
        `)
        .eq("franchise_id", franchise.id)
        .gte("start_date", today.toISOString().slice(0, 10))

      if (instancesError) {
        throw new Error(instancesError.message)
      }

      if (!instances || instances.length === 0) {
        featuredCourses = []
      } else {
        // 获取所有相关的 assignments
        const assignmentIds = instances.map((i: any) => i.assignment_id).filter(Boolean)
        const { data: assignments, error: assignmentsError } = await supabaseAdmin
          .from("course_assignments")
          .select(`
            id,
            course_id
          `)
          .in("id", assignmentIds)

        if (assignmentsError) {
          throw new Error(assignmentsError.message)
        }

        // 获取所有相关的已发布课程
        const courseIds = [...new Set(assignments?.map((a: any) => a.course_id) || [])]
        const { data: courses, error: coursesError } = await supabaseAdmin
          .from("courses")
          .select("*")
          .in("id", courseIds)
          .eq("status", "published")

        if (coursesError) {
          throw new Error(coursesError.message)
        }

        featuredCourses = courses || []
      }
      
      // 限制为前 6 个
      featuredCourses = featuredCourses.slice(0, 6)
    } else {
      // 未指定 franchise 时，使用已发布的课程
      const { getPublishedCourses } = await import("@/lib/db")
      const courses = await getPublishedCourses()
      featuredCourses = courses.slice(0, 6)
    }
    
    // 为每个课程加载 subcategories (tags)
    const coursesWithTags = await Promise.all(
      featuredCourses.map(async (course) => {
        // 获取子类标签
        const { data: subcategoryTags } = await supabaseAdmin
          .from('course_subcategory_tags')
          .select('subcategory_id')
          .eq('course_id', course.id)

        let subcategories: Array<{ id: string; name: string; display_name: string }> = []
        if (subcategoryTags && subcategoryTags.length > 0) {
          const subcategoryIds = subcategoryTags.map(t => t.subcategory_id)
          const { data: subcategoriesData } = await supabaseAdmin
            .from('course_subcategories')
            .select('id, name, display_name')
            .in('id', subcategoryIds)
            .eq('is_active', true)  // subcategories 仍然使用 is_active
          
          if (subcategoriesData) {
            subcategories = subcategoriesData.map((s: any) => ({
              id: s.id,
              name: s.name,
              display_name: s.display_name,
            }))
          }
        }

        return {
          ...course,
          subcategories,
        }
      })
    )
    
    // 映射到前端需要的格式
    const mappedCourses = coursesWithTags.map((course) => {
      // 从 subcategories 中提取 type（如果有的话）
      // 假设 subcategories 的 name 可能包含 "RoboQuest", "LaunchPad", "RoboChamps" 等
      let type: 'RoboQuest' | 'LaunchPad' | 'RoboChamps' | undefined
      if (course.subcategories && course.subcategories.length > 0) {
        const subcategoryName = course.subcategories[0].name.toLowerCase()
        if (subcategoryName.includes('roboquest') || subcategoryName.includes('rq')) {
          type = 'RoboQuest'
        } else if (subcategoryName.includes('launchpad') || subcategoryName.includes('lp')) {
          type = 'LaunchPad'
        } else if (subcategoryName.includes('robochamps') || subcategoryName.includes('rc')) {
          type = 'RoboChamps'
        }
      }
      
      // 格式化 grade level
      let gradeLevel = ''
      if (course.grade_level) {
        gradeLevel = course.grade_level
      } else if (course.age_min !== undefined && course.age_max !== undefined) {
        // 根据年龄估算年级（简单映射）
        if (course.age_min <= 5 && course.age_max <= 7) {
          gradeLevel = 'K-2'
        } else if (course.age_min <= 8 && course.age_max <= 10) {
          gradeLevel = '3-5'
        } else if (course.age_min <= 11 && course.age_max <= 13) {
          gradeLevel = '6-8'
        } else {
          gradeLevel = `${course.age_min}-${course.age_max}`
        }
      }
      
      return {
        id: course.id,
        title: course.name,
        type: type || undefined,
        gradeLevel: gradeLevel || 'All',
        description: course.description || undefined,
        slug: course.slug || undefined,
        poster_url: course.poster_url || undefined,
      }
    })
    
    return NextResponse.json(mappedCourses)
  } catch (error: any) {
    console.error("Error fetching featured courses:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch featured courses" },
      { status: 500 }
    )
  }
}

