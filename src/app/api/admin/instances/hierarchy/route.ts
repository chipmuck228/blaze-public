import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取层级数据：Franchise -> Category -> Series -> Instance
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

    // 4. 获取所有活跃的 instances（包含 assignment 信息）
    const { data: instancesData, error: instancesError } = await supabaseAdmin
      .from("course_instances")
      .select(`
        id,
        assignment_id,
        location_id,
        start_date,
        end_date,
        start_time,
        end_time,
        max_students,
        current_students,
        status,
        price_override,
        is_active,
        location:course_locations(
          id,
          name,
          address,
          city,
          state
        ),
        assignment:course_assignments(
          id,
          series_id,
          course:courses(
            id,
            name,
            slug
          ),
          category:course_categories(
            id,
            name,
            display_name
          ),
          series:course_series(
            id,
            name,
            display_name,
            franchise_id
          )
        )
      `)
      .eq("is_active", true)
      .in("status", ["scheduled", "ongoing"])
      .order("start_date", { ascending: true })
      .order("start_time", { ascending: true })

    if (instancesError) {
      throw new Error(instancesError.message)
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
        // 获取该 series 下的所有 instances
        const seriesInstances = (instancesData || [])
          .filter((instance) => {
            const assignment = Array.isArray(instance.assignment) ? instance.assignment[0] : instance.assignment
            const seriesData = assignment?.series ? (Array.isArray(assignment.series) ? assignment.series[0] : assignment.series) : null
            return seriesData?.id === series.id
          })
          .map((instance) => {
            const assignment = Array.isArray(instance.assignment) ? instance.assignment[0] : instance.assignment
            const course = assignment?.course ? (Array.isArray(assignment.course) ? assignment.course[0] : assignment.course) : null
            const location = instance.location ? (Array.isArray(instance.location) ? instance.location[0] : instance.location) : null

            return {
              id: instance.id,
              start_date: instance.start_date,
              end_date: instance.end_date,
              start_time: instance.start_time,
              end_time: instance.end_time,
              max_students: instance.max_students,
              current_students: instance.current_students,
              status: instance.status,
              price_override: instance.price_override,
              location: location ? {
                id: location.id,
                name: location.name,
                address: location.address,
                city: location.city,
                state: location.state,
              } : null,
              course: course ? {
                id: course.id,
                name: course.name,
                slug: course.slug,
              } : null,
            }
          })

        categoryData.series.push({
          id: series.id,
          name: series.name,
          display_name: series.display_name,
          description: series.description,
          instances: seriesInstances,
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
    console.error("Error fetching instances hierarchy:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch instances hierarchy" },
      { status: 500 }
    )
  }
}

