import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getInstanceAvailableCapacity } from "@/lib/db"

// GET /api/public/instances/[id]
// 获取单个 instance 的详细信息（包含 franchise、category、program、offering）
// 使用新表：instance_v2 和 offerings_v2
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      console.error('[Instances API] Missing instance ID');
      return NextResponse.json(
        { error: "Instance ID is required" },
        { status: 400 }
      );
    }
    
    console.log(`[Instances API] Fetching instance details for ID: ${id}`);

    // 优先从 instance_v2 查询
    const { data: instanceV2, error: instanceV2Error } = await supabaseAdmin
      .from('instance_v2')
      .select(`
        id,
        offering_id,
        series_id,
        category_id,
        franchise_id,
        start_date,
        end_date,
        start_time,
        end_time,
        max_students,
        current_students,
        status,
        price_override,
        is_active,
        location_id,
        location:course_locations(
          id,
          name,
          address,
          city,
          state,
          zip_code
        ),
        series:course_series(
          id,
          name,
          display_name,
          franchise_id
        ),
        category:course_categories(
          id,
          name,
          display_name
        ),
        offering:offerings_v2(
          id,
          name,
          slug,
          description,
          poster_url,
          offering_type,
          status,
          base_price,
          target_audience,
          learning_outcomes,
          prerequisites
        )
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (instanceV2 && !instanceV2Error) {
      console.log(`[Instances API] Instance found in instance_v2:`, {
        id: instanceV2.id,
        offering_id: instanceV2.offering_id,
        series_id: instanceV2.series_id
      });

      // 处理嵌套数据
      const offering = Array.isArray(instanceV2.offering) 
        ? instanceV2.offering[0] 
        : instanceV2.offering

      if (!offering) {
        return NextResponse.json(
          { error: "Offering not found" },
          { status: 404 }
        )
      }

      // 只返回已发布的 offerings
      if (offering.status !== 'published') {
        return NextResponse.json(
          { error: "Offering not available" },
          { status: 404 }
        )
      }

      const category = Array.isArray(instanceV2.category)
        ? instanceV2.category[0]
        : instanceV2.category

      const series = Array.isArray(instanceV2.series)
        ? instanceV2.series[0]
        : instanceV2.series

      // 获取 franchise 信息（从 franchises_v2）
      let franchise: any = null
      if (instanceV2.franchise_id) {
        try {
          const { getFranchiseV2 } = await import("@/lib/db-v2")
          const franchiseV2 = await getFranchiseV2(instanceV2.franchise_id)
          if (franchiseV2) {
            franchise = {
              id: franchiseV2.id,
              code: franchiseV2.code,
              name: franchiseV2.name,
              cancellation_policy: franchiseV2.cancellation_policy || null,
            }
          }
        } catch (error) {
          console.error(`[Instances API] Error fetching franchise_v2:`, error)
          // 尝试通过 legacy_franchise_id 查找
          if (series?.franchise_id) {
            try {
              const { getFranchiseV2ByLegacyId } = await import("@/lib/db-v2")
              const franchiseV2 = await getFranchiseV2ByLegacyId(series.franchise_id)
              if (franchiseV2) {
                franchise = {
                  id: franchiseV2.id,
                  code: franchiseV2.code,
                  name: franchiseV2.name,
                  cancellation_policy: franchiseV2.cancellation_policy || null,
                }
              }
            } catch (legacyError) {
              console.error(`[Instances API] Error fetching franchise_v2 by legacy_id:`, legacyError)
            }
          }
        }
      }

      // 如果没有找到 franchise，尝试从 series.franchise_id 获取（可能是旧表 ID）
      if (!franchise && series?.franchise_id) {
        try {
          const { getFranchiseV2ByLegacyId } = await import("@/lib/db-v2")
          const franchiseV2 = await getFranchiseV2ByLegacyId(series.franchise_id)
          if (franchiseV2) {
            franchise = {
              id: franchiseV2.id,
              code: franchiseV2.code,
              name: franchiseV2.name,
              cancellation_policy: franchiseV2.cancellation_policy || null,
            }
          }
        } catch (error) {
          console.error(`[Instances API] Error fetching franchise_v2 by legacy_id:`, error)
        }
      }

      // 获取可用容量（需要检查 getInstanceAvailableCapacity 是否支持 instance_v2）
      let availableCapacity = 0
      try {
        availableCapacity = await getInstanceAvailableCapacity(id)
      } catch (error) {
        console.warn(`[Instances API] Error getting available capacity, using instance data:`, error)
        availableCapacity = (instanceV2.max_students || 0) - (instanceV2.current_students || 0)
      }

      // 构建返回数据（保持与旧 API 兼容的格式）
      const result = {
        id: instanceV2.id,
        start_date: instanceV2.start_date,
        end_date: instanceV2.end_date,
        start_time: instanceV2.start_time,
        end_time: instanceV2.end_time,
        class_time: instanceV2.start_time && instanceV2.end_time 
          ? `${instanceV2.start_time} - ${instanceV2.end_time}`
          : undefined,
        max_students: instanceV2.max_students,
        current_students: instanceV2.current_students,
        available_capacity: availableCapacity,
        is_full: availableCapacity <= 0,
        location: instanceV2.location,
        franchise: franchise,
        category: category ? {
          id: category.id,
          name: category.name,
          display_name: category.display_name,
        } : null,
        program: series ? {
          id: series.id,
          name: series.name,
          display_name: series.display_name,
        } : null,
        course: {
          id: offering.id,
          name: offering.name,
          slug: offering.slug,
          description: offering.description,
          target_audience: offering.target_audience,
          learning_outcomes: offering.learning_outcomes,
          prerequisites: offering.prerequisites,
          cancellation_policy: franchise?.cancellation_policy || null,
          base_price: offering.base_price,
          duration_hours: null, // Offerings 不再有 duration_hours，在 instance 层面
          session_count: null, // Offerings 不再有 session_count，在 instance 层面
          age_min: null, // Offerings 不再有 age_min，在 instance 层面
          age_max: null, // Offerings 不再有 age_max，在 instance 层面
          grade_level: null, // Offerings 不再有 grade_level，在 instance 层面
          poster_url: offering.poster_url,
        },
      }

      return NextResponse.json(result)
    }

    // 向后兼容：如果新表没有找到，查询旧表
    console.log(`[Instances API] Instance not found in instance_v2, trying legacy table...`);
    
    const { data: instance, error: instanceError } = await supabaseAdmin
      .from('course_instances')
      .select(`
        *,
        assignment:course_assignments(
          id,
          category_id,
          series_id,
          category:course_categories(
            id,
            name,
            display_name
          ),
          series:course_series(
            id,
            name,
            display_name,
            franchise_id,
            franchise:franchises(
              id,
              code,
              name
            )
          ),
          course:courses(
            *
          )
        ),
        location:course_locations(
          id,
          name,
          address,
          city,
          state,
          zip_code
        )
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (instanceError) {
      console.error(`[Instances API] Supabase error:`, instanceError);
      return NextResponse.json(
        { error: "Instance not found", details: instanceError.message },
        { status: 404 }
      );
    }
    
    if (!instance) {
      console.error(`[Instances API] Instance not found for ID: ${id}`);
      return NextResponse.json(
        { error: "Instance not found" },
        { status: 404 }
      );
    }
    
    console.log(`[Instances API] Instance found in legacy table:`, {
      id: instance.id,
      assignment_id: instance.assignment_id,
      has_assignment: !!instance.assignment
    });

    // 处理嵌套数据（Supabase 可能返回数组或对象）
    const assignment = Array.isArray(instance.assignment) 
      ? instance.assignment[0] 
      : instance.assignment

    if (!assignment) {
      return NextResponse.json(
        { error: "Assignment not found" },
        { status: 404 }
      )
    }

    const course = Array.isArray(assignment.course) 
      ? assignment.course[0] 
      : assignment.course

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      )
    }

    // 只返回已发布的课程
    if (course.status !== 'published') {
      return NextResponse.json(
        { error: "Course not available" },
        { status: 404 }
      )
    }

    const category = Array.isArray(assignment.category)
      ? assignment.category[0]
      : assignment.category

    const series = Array.isArray(assignment.series)
      ? assignment.series[0]
      : assignment.series

    const franchise = series?.franchise
      ? (Array.isArray(series.franchise) ? series.franchise[0] : series.franchise)
      : null

    // Phase 4: 从 franchises_v2 获取 cancellation_policy
    let franchiseCancellationPolicy: string | null = null
    if (franchise?.id) {
      try {
        const { getFranchiseV2ByLegacyId } = await import("@/lib/db-v2")
        const franchiseV2 = await getFranchiseV2ByLegacyId(franchise.id)
        if (franchiseV2) {
          franchiseCancellationPolicy = franchiseV2.cancellation_policy || null
        }
      } catch (error) {
        console.error(`[Instances API] Error fetching franchise_v2 cancellation_policy:`, error)
      }
    }

    // 获取可用容量
    const availableCapacity = await getInstanceAvailableCapacity(id)

    // 构建返回数据
    const result = {
      id: instance.id,
      start_date: instance.start_date,
      end_date: instance.end_date,
      start_time: instance.start_time,
      end_time: instance.end_time,
      class_time: instance.class_time,
      max_students: instance.max_students,
      available_capacity: availableCapacity,
      is_full: availableCapacity <= 0,
      location: instance.location,
      franchise: franchise ? {
        id: franchise.id,
        code: franchise.code,
        name: franchise.name,
        cancellation_policy: franchiseCancellationPolicy, // Phase 4: 添加取消政策
      } : null,
      category: category ? {
        id: category.id,
        name: category.name,
        display_name: category.display_name,
      } : null,
      program: series ? {
        id: series.id,
        name: series.name,
        display_name: series.display_name,
      } : null,
      course: {
        id: course.id,
        name: course.name,
        slug: course.slug,
        description: course.description,
        target_audience: course.target_audience,
        learning_outcomes: course.outcomes || course.learning_outcomes,
        prerequisites: course.prerequisites,
        // Phase 4: cancellation_policy 现在从 franchise 获取，不再从 course 获取
        cancellation_policy: franchiseCancellationPolicy || course.cancellation_policy || null,
        base_price: course.base_price,
        duration_hours: course.duration_hours || course.number_of_sessions,
        session_count: course.session_count || course.number_of_sessions,
        age_min: course.age_min || course.target_age_min,
        age_max: course.age_max || course.target_age_max,
        grade_level: course.grade_level || (Array.isArray(course.target_grades) ? course.target_grades[0] : course.target_grades),
        poster_url: course.poster_url,
      },
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[Instances API] Error fetching instance details:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch instance details" },
      { status: 500 }
    )
  }
}
