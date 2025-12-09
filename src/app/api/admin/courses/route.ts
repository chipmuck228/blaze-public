import { NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  getAllCourseCategories,
  getCourseSeriesByCategory,
  getCourseSubcategoriesBySeries,
  getCoursesBySubcategory,
  getCourseWithDetails,
} from "@/lib/db"

// 获取所有课程（支持层级查询）
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("categoryId")
    const seriesId = searchParams.get("seriesId")
    const subcategoryId = searchParams.get("subcategoryId")
    const courseId = searchParams.get("courseId")

    // 如果提供了courseId，返回单个课程的详细信息
    if (courseId) {
      const course = await getCourseWithDetails(courseId)
      if (!course) {
        return NextResponse.json({ error: "Course not found" }, { status: 404 })
      }
      return NextResponse.json(course, { status: 200 })
    }

    // 如果提供了subcategoryId，返回该子类下的所有课程
    if (subcategoryId) {
      const courses = await getCoursesBySubcategory(subcategoryId)
      return NextResponse.json(courses, { status: 200 })
    }

    // 如果提供了seriesId，返回该系列下的所有子类和课程
    if (seriesId) {
      const subcategories = await getCourseSubcategoriesBySeries(seriesId)
      const coursesData = await Promise.all(
        subcategories.map(async (subcategory) => {
          const courses = await getCoursesBySubcategory(subcategory.id)
          return {
            ...subcategory,
            courses,
          }
        })
      )
      return NextResponse.json(coursesData, { status: 200 })
    }

    // 如果提供了categoryId，返回该大类下的所有系列、子类和课程
    if (categoryId) {
      const series = await getCourseSeriesByCategory(categoryId)
      const fullData = await Promise.all(
        series.map(async (s) => {
          const subcategories = await getCourseSubcategoriesBySeries(s.id)
          const subcategoriesWithCourses = await Promise.all(
            subcategories.map(async (subcategory) => {
              const courses = await getCoursesBySubcategory(subcategory.id)
              return {
                ...subcategory,
                courses,
              }
            })
          )
          return {
            ...s,
            subcategories: subcategoriesWithCourses,
          }
        })
      )
      return NextResponse.json(fullData, { status: 200 })
    }

    // 默认返回所有大类及其完整层级结构
    const categories = await getAllCourseCategories()
    const fullData = await Promise.all(
      categories.map(async (category) => {
        const series = await getCourseSeriesByCategory(category.id)
        const seriesWithData = await Promise.all(
          series.map(async (s) => {
            const subcategories = await getCourseSubcategoriesBySeries(s.id)
            const subcategoriesWithCourses = await Promise.all(
              subcategories.map(async (subcategory) => {
                const courses = await getCoursesBySubcategory(subcategory.id)
                return {
                  ...subcategory,
                  courses,
                }
              })
            )
            return {
              ...s,
              subcategories: subcategoriesWithCourses,
            }
          })
        )
        return {
          ...category,
          series: seriesWithData,
        }
      })
    )

    return NextResponse.json(fullData, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching courses:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch courses" },
      { status: 500 }
    )
  }
}

// 创建新课程
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      subcategory_id,
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
      display_order,
    } = body

    if (!subcategory_id || !name) {
      return NextResponse.json(
        { error: "Missing required fields: subcategory_id, name" },
        { status: 400 }
      )
    }

    const { supabaseAdmin } = await import("@/lib/supabase")
    const { data, error } = await supabaseAdmin
      .from("courses")
      .insert({
        subcategory_id,
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
        display_order: display_order || 0,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating course:", error)
      return NextResponse.json(
        { error: error.message || "Failed to create course" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error("Error creating course:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create course" },
      { status: 500 }
    )
  }
}

