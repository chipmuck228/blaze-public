import { NextResponse } from "next/server"
import {getErrorMessage, type StringKeyRecord} from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { unwrapRelation } from "@/lib/supabase-relation"
import {
  catalogCols,
  catalogTables,
  normalizeSessionRow,
  sessionLocationEmbed,
} from "@/lib/catalog-db"

// 获取 programs 的层级结构（Franchise -> Category -> Program -> Instance）
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const franchiseId = searchParams.get("franchiseId")
    const categoryId = searchParams.get("categoryId")

    // 1. 获取所有 franchises
    let franchisesQuery = supabaseAdmin
      .from(catalogTables.campus)
      .select("id, code, name, is_active")
      .order("name", { ascending: true })

    if (franchiseId) {
      franchisesQuery = franchisesQuery.eq("id", franchiseId)
    }

    const { data: franchises, error: franchisesError } = await franchisesQuery

    if (franchisesError) {
      console.error("Error fetching franchises:", franchisesError)
      return NextResponse.json(
        { error: franchisesError.message || "Failed to fetch franchises" },
        { status: 500 }
      )
    }

    if (!franchises || franchises.length === 0) {
      return NextResponse.json({ hierarchy: [] }, { status: 200 })
    }

    // 2. 为每个 franchise 获取订阅的 categories 和 programs
    const hierarchy = await Promise.all(
      franchises.map(async (franchise) => {
        // 获取 franchise 订阅的 categories
        const mapStageFk = catalogCols.campusStageMap.stageId
        const { data: categoryMaps, error: categoryMapsError } = await supabaseAdmin
          .from(catalogTables.campusStageMap)
          .select(`
            ${mapStageFk},
            is_visible,
            display_order,
            category:${catalogTables.stage}(
              id,
              name,
              display_name,
              description,
              poster_url,
              is_active
            )
          `)
          .eq(catalogCols.campusStageMap.campusId, franchise.id)
          .order("display_order", { ascending: true })

        if (categoryMapsError) {
          console.error(`Error fetching categories for franchise ${franchise.id}:`, categoryMapsError)
          return {
            ...franchise,
            categories: [],
          }
        }

        // 过滤 categories
        let categories = (categoryMaps || [])
          .map((map) => unwrapRelation(map.category))
          .filter((cat): cat is NonNullable<typeof cat> => !!cat && cat.is_active === true)

        if (categoryId) {
          categories = categories.filter((cat) => cat.id === categoryId)
        }

        // 为每个 category 获取 programs
        const categoriesWithPrograms = await Promise.all(
          categories.map(async (category) => {
            // 获取该 category 下的 programs
            const { data: programs, error: programsError } = await supabaseAdmin
              .from(catalogTables.series)
              .select(`
                id,
                name,
                display_name,
                description,
                start_date,
                end_date,
                display_order,
                is_active,
                featured,
                poster_url,
                created_at,
                updated_at
              `)
              .eq(catalogCols.series.campusId, franchise.id)
              .eq(catalogCols.series.stageId, category.id)
              .order("display_order", { ascending: true })
              .order("start_date", { ascending: false })

            if (programsError) {
              console.error(`Error fetching programs for category ${category.id}:`, programsError)
              return {
                ...category,
                programs: [],
              }
            }

            // 为每个 program 获取 instances
            const programsWithInstances = await Promise.all(
              (programs || []).map(async (program) => {
                const seriesIdCol = catalogCols.session.seriesId
                const locationIdCol = catalogCols.session.locationId
                const { data: instances, error: instancesError } = await supabaseAdmin
                  .from(catalogTables.session)
                  .select(`
                    id,
                    ${seriesIdCol},
                    offering_id,
                    ${locationIdCol},
                    price_override,
                    start_date,
                    end_date,
                    start_time,
                    end_time,
                    session_count,
                    days_of_week,
                    max_students,
                    current_students,
                    instance_data_ext,
                    status,
                    is_active,
                    offering:${catalogTables.offering}(
                      id,
                      name,
                      slug,
                      description,
                      base_price,
                      currency,
                      offering_type:${catalogTables.offeringType}(
                        code,
                        name,
                        instance_schema
                      )
                    ),
                    ${sessionLocationEmbed("id, name, display_name")}
                  `)
                  .eq(catalogCols.session.seriesId, program.id)
                  .order("start_date", { ascending: true })

                if (instancesError) {
                  console.error(`Error fetching instances for program ${program.id}:`, instancesError)
                  return {
                    ...program,
                    instances: [],
                  }
                }

                return {
                  ...program,
                  instances: (instances || []).map((row) => normalizeSessionRow(row)),
                }
              })
            )

            return {
              ...category,
              programs: programsWithInstances,
            }
          })
        )

        return {
          ...franchise,
          categories: categoriesWithPrograms,
        }
      })
    )

    return NextResponse.json({ hierarchy }, { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching hierarchy:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch hierarchy" },
      { status: 500 }
    )
  }
}
