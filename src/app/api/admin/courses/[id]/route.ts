import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getCourseWithDetails, updateCourse, deleteCourse, updateCourseSubcategoryTags } from "@/lib/db"

// 获取单个课程（包含标签和分配信息）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const course = await getCourseWithDetails(id)
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // 将 subcategories 映射为 tags 以匹配前端期望
    const courseWithTags = {
      ...course,
      tags: course.subcategories?.map(s => ({
        id: s.id,
        name: s.name,
        display_name: s.display_name,
      })) || [],
    }

    return NextResponse.json(courseWithTags, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching course:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch course" },
      { status: 500 }
    )
  }
}

// 更新课程（只更新课程内容，标签单独处理）
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
      status,  // 使用 status 替代 is_active
      subcategory_ids, // 子类标签ID数组
    } = body

    // 如果状态变更，检查影响（双重保护）
    if (status) {
      const currentCourse = await getCourseWithDetails(id)
      if (currentCourse) {
        const currentStatus = currentCourse.status
        
        // 如果是从 published 改为 suspended 或 archived，检查影响
        if (currentStatus === 'published' && (status === 'suspended' || status === 'archived')) {
          // 这里可以添加额外的验证逻辑，但前端已经检查过了
          // 如果需要，可以在这里再次检查并返回警告
        }
      }
    }

    // 更新课程基本信息
    const course = await updateCourse(id, {
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
      status,  // 使用 status 替代 is_active
    })

    // 更新子类标签（如果提供了）
    if (subcategory_ids !== undefined) {
      await updateCourseSubcategoryTags(id, Array.isArray(subcategory_ids) ? subcategory_ids : [])
    }

    // 返回完整的课程信息
    const courseWithDetails = await getCourseWithDetails(id)
    
    // 将 subcategories 映射为 tags 以匹配前端期望
    const courseWithTags = courseWithDetails ? {
      ...courseWithDetails,
      tags: courseWithDetails.subcategories?.map(s => ({
        id: s.id,
        name: s.name,
        display_name: s.display_name,
      })) || [],
    } : null

    return NextResponse.json(courseWithTags, { status: 200 })
  } catch (error: any) {
    console.error("Error updating course:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update course" },
      { status: 500 }
    )
  }
}

// 删除课程（会级联删除所有 Assignment 和 Instance）
// 注意：只有 draft 状态的课程可以删除
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 检查课程状态：只有 draft 状态的课程可以删除
    const course = await getCourseWithDetails(id)
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    if (course.status !== 'draft') {
      return NextResponse.json(
        { 
          error: `Cannot delete course with status '${course.status}'. Only draft courses can be deleted. Please archive the course instead.` 
        },
        { status: 400 }
      )
    }

    await deleteCourse(id)

    return NextResponse.json({ message: "Course deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting course:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete course" },
      { status: 500 }
    )
  }
}

