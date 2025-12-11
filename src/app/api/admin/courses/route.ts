import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getAllCourses,
  getCourseWithDetails,
  createCourse,
  updateCourse,
  deleteCourse,
} from "@/lib/db"

// 获取所有课程（独立管理，不包含分类信息）
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get("courseId")
    const search = searchParams.get("search")

    // 如果提供了courseId，返回单个课程的详细信息（包含标签和分配）
    if (courseId) {
      const course = await getCourseWithDetails(courseId)
      if (!course) {
        return NextResponse.json({ error: "Course not found" }, { status: 404 })
      }
      return NextResponse.json(course, { status: 200 })
    }

    // 获取所有课程
    let courses = await getAllCourses()

    // 如果提供了搜索参数，进行过滤
    if (search) {
      const searchLower = search.toLowerCase()
      courses = courses.filter(
        (course) =>
          course.name.toLowerCase().includes(searchLower) ||
          course.description?.toLowerCase().includes(searchLower) ||
          course.slug?.toLowerCase().includes(searchLower)
      )
    }

    // 为每个课程加载 tags (subcategories)
    const { supabaseAdmin } = await import("@/lib/supabase")
    const coursesWithTags = await Promise.all(
      courses.map(async (course) => {
        // 获取子类标签
        const { data: subcategoryTags } = await supabaseAdmin
          .from('course_subcategory_tags')
          .select('subcategory_id')
          .eq('course_id', course.id)

        let tags: Array<{ id: string; name: string; display_name: string }> = []
        if (subcategoryTags && subcategoryTags.length > 0) {
          const subcategoryIds = subcategoryTags.map(t => t.subcategory_id)
          const { data: subcategoriesData } = await supabaseAdmin
            .from('course_subcategories')
            .select('id, name, display_name')
            .in('id', subcategoryIds)
            .eq('is_active', true)
          
          if (subcategoriesData) {
            tags = subcategoriesData.map((s: any) => ({
              id: s.id,
              name: s.name,
              display_name: s.display_name,
            }))
          }
        }

        return {
          ...course,
          tags,
        }
      })
    )

    return NextResponse.json(coursesWithTags, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching courses:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch courses" },
      { status: 500 }
    )
  }
}

// 创建新课程（只包含课程内容，不包含分类）
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      slug,
      description,
      target_audience,
      outcomes,
      prerequisites,
      cancellation_policy,
      number_of_sessions,
      target_age_min,
      target_age_max,
      target_grades,
      base_price,
      currency,
      subcategory_ids, // 子类标签ID数组
    } = body

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      )
    }

    // 创建课程
    const course = await createCourse({
      name,
      slug,
      description,
      target_audience,
      outcomes,
      prerequisites,
      cancellation_policy,
      number_of_sessions,
      target_age_min,
      target_age_max,
      target_grades,
      base_price,
      currency: currency || "USD",
      is_active: true,
    })

    // 如果有子类标签，添加标签
    if (subcategory_ids && Array.isArray(subcategory_ids) && subcategory_ids.length > 0) {
      const { updateCourseSubcategoryTags } = await import("@/lib/db")
      await updateCourseSubcategoryTags(course.id, subcategory_ids)
    }

    // 返回完整的课程信息（包含标签）
    const courseWithDetails = await getCourseWithDetails(course.id)
    
    // 将 subcategories 映射为 tags 以匹配前端期望
    const courseWithTags = courseWithDetails ? {
      ...courseWithDetails,
      tags: courseWithDetails.subcategories?.map(s => ({
        id: s.id,
        name: s.name,
        display_name: s.display_name,
      })) || [],
    } : null

    return NextResponse.json(courseWithTags, { status: 201 })
  } catch (error: any) {
    console.error("Error creating course:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create course" },
      { status: 500 }
    )
  }
}

