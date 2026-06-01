import { NextResponse } from "next/server"
import {getErrorMessage, type StringKeyRecord} from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import type { CourseEnrollment } from "@/lib/db"
import { getFranchiseByCode } from "@/lib/db"

type AdminEnrollmentListRow = {
  user?: { name?: string; email?: string }
  instance?: { assignment?: { course?: { id?: string; name?: string } } }
}

// GET: 获取所有注册（支持筛选、分页、排序）
export async function GET(request: Request) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const paymentStatus = searchParams.get("payment_status")
    const userId = searchParams.get("user_id")
    const instanceId = searchParams.get("instance_id")
    const courseId = searchParams.get("course_id")
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    const search = searchParams.get("search")
    const franchiseCode = searchParams.get("franchise")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const sortBy = searchParams.get("sort_by") || "created_at"
    const sortOrder = searchParams.get("sort_order") || "desc"

    // 如果指定了 franchise，则解析为 franchise_id
    let franchiseId: string | null = null
    if (franchiseCode) {
      const franchise = await getFranchiseByCode(franchiseCode)
      if (!franchise) {
        return NextResponse.json(
          { error: "Invalid franchise code" },
          { status: 400 }
        )
      }
      franchiseId = franchise.id
    }

    // 构建查询
    let query = supabaseAdmin
      .from("course_enrollments")
      .select(`
        *,
        user:users(id, name, email),
        instance:course_instances(
          id,
          start_date,
          end_date,
          start_time,
          end_time,
          assignment:course_assignments(
            id,
            course:courses(id, name),
            category:course_categories(display_name, name),
            series:course_series(display_name, name),
            location:course_locations(name)
          ),
          location:course_locations(name)
        )
      `, { count: "exact" })

    // 应用筛选
    if (status) {
      query = query.eq("status", status)
    }
    if (paymentStatus) {
      query = query.eq("payment_status", paymentStatus)
    }
    if (userId) {
      query = query.eq("user_id", userId)
    }
    if (instanceId) {
      query = query.eq("instance_id", instanceId)
    }
    if (startDate) {
      query = query.gte("created_at", startDate)
    }
    if (endDate) {
      query = query.lte("created_at", endDate)
    }
    if (franchiseId) {
      query = query.eq("franchise_id", franchiseId)
    }

    // 排序
    const ascending = sortOrder === "asc"
    query = query.order(sortBy, { ascending })

    // 分页
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      throw new Error(getErrorMessage(error))
    }

    // 如果有关键词搜索，在内存中过滤（因为涉及关联表）
    let filteredData = data || []
    if (search) {
      const searchLower = search.toLowerCase()
      filteredData = filteredData.filter((row) => {
        const enrollment = row as AdminEnrollmentListRow
        const userName = enrollment.user?.name?.toLowerCase() || ""
        const userEmail = enrollment.user?.email?.toLowerCase() || ""
        const courseName = enrollment.instance?.assignment?.course?.name?.toLowerCase() || ""
        return (
          userName.includes(searchLower) ||
          userEmail.includes(searchLower) ||
          courseName.includes(searchLower)
        )
      })
    }

    // 如果指定了 course_id，在内存中过滤
    if (courseId) {
      filteredData = filteredData.filter((row) => {
        const enrollment = row as AdminEnrollmentListRow
        return enrollment.instance?.assignment?.course?.id === courseId
      })
    }

    return NextResponse.json({
      enrollments: filteredData,
      total: count || filteredData.length,
      page,
      limit,
      totalPages: Math.ceil((count || filteredData.length) / limit),
    })
  } catch (error: unknown) {
    console.error("Error fetching enrollments:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch enrollments" },
      { status: 500 }
    )
  }
}

