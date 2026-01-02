import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取层级数据：Franchise -> Category -> Series -> Courses
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. 获取所有活跃的 franchises
    const { data: franchisesData, error: franchisesError } = await supabaseAdmin
      .from("franchises")
      .select("id, code, name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (franchisesError) {
      throw new Error(franchisesError.message)
    }

    // 2. 获取所有活跃的 categories
    const { data: categoriesData, error: categoriesError } = await supabaseAdmin
      .from("course_categories")
      .select("id, name, display_name, is_active")
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (categoriesError) {
      throw new Error(categoriesError.message)
    }

    // 3. 获取所有活跃的 series（包含 franchise 和 category 信息）
    const { data: seriesData, error: seriesError } = await supabaseAdmin
      .from("course_series")
      .select(`
        id,
        name,
        display_name,
        description,
        franchise_id,
        category_id,
        is_active,
        franchise:franchises(id, code, name),
        category:course_categories(id, name, display_name)
      `)
      .eq("is_active", true)
      .order("display_order", { ascending: true })

    if (seriesError) {
      throw new Error(seriesError.message)
    }

    // 4. 获取所有活跃的 assignments（包含 course 信息）
    const { data: assignmentsData, error: assignmentsError } = await supabaseAdmin
      .from("course_assignments")
      .select(`
        id,
        series_id,
        course_id,
        is_active,
        course:courses(
          id,
          name,
          slug,
          description,
          status,
          base_price
        )
      `)
      .eq("is_active", true)

    if (assignmentsError) {
      throw new Error(assignmentsError.message)
    }

    // 5. 组织层级结构
    const hierarchy: any[] = []

    // 按 franchise 分组
    const franchiseMap = new Map<string, any>()

    // 先添加所有 franchises（包括没有 series 的）
    for (const franchise of franchisesData || []) {
      franchiseMap.set(franchise.id, {
        id: franchise.id,
        code: franchise.code,
        name: franchise.name,
        categories: new Map<string, any>(),
      })
    }

    // 添加 "Global / Unassigned" franchise（用于没有 franchise_id 的 series）
    const globalFranchiseId = "global"
    franchiseMap.set(globalFranchiseId, {
      id: globalFranchiseId,
      code: "global",
      name: "Global / Unassigned",
      categories: new Map<string, any>(),
    })

    // 按 category 分组 series
    for (const series of seriesData || []) {
      const franchiseId = series.franchise_id || globalFranchiseId
      const franchise = franchiseMap.get(franchiseId)
      if (!franchise) continue

      const categoryId = series.category_id
      if (!franchise.categories.has(categoryId)) {
        const category = categoriesData?.find((c) => c.id === categoryId)
        if (category) {
          franchise.categories.set(categoryId, {
            id: category.id,
            name: category.name,
            display_name: category.display_name,
            series: [],
          })
        }
      }

      const categoryData = franchise.categories.get(categoryId)
      if (categoryData) {
        // 获取该 series 下的所有 courses（通过 assignments）
        const courses = (assignmentsData || [])
          .filter((a) => a.series_id === series.id)
          .map((a) => {
            const course = Array.isArray(a.course) ? a.course[0] : a.course
            return course
              ? {
                  id: course.id,
                  name: course.name,
                  slug: course.slug,
                  description: course.description,
                  status: course.status,
                  base_price: course.base_price,
                }
              : null
          })
          .filter(Boolean)

        categoryData.series.push({
          id: series.id,
          name: series.name,
          display_name: series.display_name,
          description: series.description,
          courses: courses,
        })
      }
    }

    // 转换为数组格式
    for (const franchise of franchiseMap.values()) {
      const categories = Array.from(franchise.categories.values()).map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        display_name: cat.display_name,
        series: cat.series,
      }))

      // 只包含有 series 的 franchise
      if (categories.length > 0) {
        hierarchy.push({
          ...franchise,
          categories: categories,
        })
      }
    }

    return NextResponse.json({ hierarchy }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching hierarchy:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch hierarchy" },
      { status: 500 }
    )
  }
}

