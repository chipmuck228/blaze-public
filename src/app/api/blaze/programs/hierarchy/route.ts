import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取层级数据：Franchise -> Category -> Program -> Instance
// 使用新的 blaze_ 表
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 1. 获取所有激活的 Franchises
    const { data: franchises, error: franchisesError } = await supabaseAdmin
      .from("blaze_franchise")
      .select("id, code, name, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (franchisesError) {
      throw new Error(`Failed to fetch franchises: ${franchisesError.message}`)
    }

    // 2. 获取所有激活的 Categories（按 franchise 分组）
    const { data: categories, error: categoriesError } = await supabaseAdmin
      .from("blaze_category")
      .select("id, name, display_name, franchise_id, is_active")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true })

    if (categoriesError) {
      throw new Error(`Failed to fetch categories: ${categoriesError.message}`)
    }

    // 3. 获取所有激活的 Programs（按 category 分组）
    const { data: programs, error: programsError } = await supabaseAdmin
      .from("blaze_program")
      .select("id, name, display_name, description, category_id, franchise_id, start_date, end_date, display_order, is_active")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("start_date", { ascending: false })

    if (programsError) {
      throw new Error(`Failed to fetch programs: ${programsError.message}`)
    }

    // 4. 获取所有激活的 Instances（关联 offering 和 campus）
    const { data: instances, error: instancesError } = await supabaseAdmin
      .from("blaze_instance")
      .select(`
        id,
        program_id,
        offering_id,
        category_id,
        franchise_id,
        campus_id,
        start_date,
        end_date,
        start_time,
        end_time,
        max_students,
        current_students,
        status,
        price_override,
        age_min,
        age_max,
        target_grades,
        session_count,
        duration_hours,
        duration_days,
        days_of_week,
        is_active,
        notes,
        offering:blaze_offering(
          id,
          name,
          slug,
          description,
          base_price,
          currency,
          poster_url,
          status,
          offering_type_id,
          offering_type:blaze_offering_type(
            id,
            code,
            name
          )
        ),
        campus:blaze_campus(
          id,
          name,
          display_name,
          address,
          city,
          state
        )
      `)
      .eq("is_active", true)
      .order("start_date", { ascending: true })
      .order("start_time", { ascending: true })

    if (instancesError) {
      throw new Error(`Failed to fetch instances: ${instancesError.message}`)
    }

    // 5. 构建层级结构
    const hierarchy = (franchises || []).map((franchise) => {
      // 获取该 franchise 的 categories
      const franchiseCategories = (categories || []).filter(
        (cat) => cat.franchise_id === franchise.id
      )

      // 为每个 category 获取 programs
      const categoriesWithPrograms = franchiseCategories.map((category) => {
        // 获取该 category 的 programs
        const categoryPrograms = (programs || []).filter(
          (prog) => prog.category_id === category.id && prog.franchise_id === franchise.id
        )

        // 为每个 program 获取 instances
        const programsWithInstances = categoryPrograms.map((program) => {
          // 获取该 program 的 instances
          const programInstances = (instances || []).filter(
            (inst) => inst.program_id === program.id
          )

          return {
            ...program,
            instances: programInstances || [],
          }
        })

        return {
          ...category,
          programs: programsWithInstances || [],
        }
      })

      return {
        ...franchise,
        categories: categoriesWithPrograms || [],
      }
    })

    return NextResponse.json({ hierarchy }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching hierarchy:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch hierarchy" },
      { status: 500 }
    )
  }
}
