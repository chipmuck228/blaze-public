import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getInstanceAvailableCapacity } from "@/lib/db"

// GET /api/public/instances/[id]
// 获取单个 instance 的详细信息（包含 franchise、category、program、course）
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

    // 获取 instance 详细信息
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
    
    console.log(`[Instances API] Instance found:`, {
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
        cancellation_policy: course.cancellation_policy,
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
