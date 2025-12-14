import { NextResponse } from "next/server"
import { getAllCourses } from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  try {
    // 获取所有活跃的课程
    const courses = await getAllCourses()
    
    // 只返回前 6 个课程
    const featuredCourses = courses.slice(0, 6)
    
    // 为每个课程加载 subcategories (tags)
    const coursesWithTags = await Promise.all(
      featuredCourses.map(async (course) => {
        // 获取子类标签
        const { data: subcategoryTags } = await supabaseAdmin
          .from('course_subcategory_tags')
          .select('subcategory_id')
          .eq('course_id', course.id)

        let subcategories: Array<{ id: string; name: string; display_name: string }> = []
        if (subcategoryTags && subcategoryTags.length > 0) {
          const subcategoryIds = subcategoryTags.map(t => t.subcategory_id)
          const { data: subcategoriesData } = await supabaseAdmin
            .from('course_subcategories')
            .select('id, name, display_name')
            .in('id', subcategoryIds)
            .eq('is_active', true)
          
          if (subcategoriesData) {
            subcategories = subcategoriesData.map((s: any) => ({
              id: s.id,
              name: s.name,
              display_name: s.display_name,
            }))
          }
        }

        return {
          ...course,
          subcategories,
        }
      })
    )
    
    // 映射到前端需要的格式
    const mappedCourses = coursesWithTags.map((course) => {
      // 从 subcategories 中提取 type（如果有的话）
      // 假设 subcategories 的 name 可能包含 "RoboQuest", "LaunchPad", "RoboChamps" 等
      let type: 'RoboQuest' | 'LaunchPad' | 'RoboChamps' | undefined
      if (course.subcategories && course.subcategories.length > 0) {
        const subcategoryName = course.subcategories[0].name.toLowerCase()
        if (subcategoryName.includes('roboquest') || subcategoryName.includes('rq')) {
          type = 'RoboQuest'
        } else if (subcategoryName.includes('launchpad') || subcategoryName.includes('lp')) {
          type = 'LaunchPad'
        } else if (subcategoryName.includes('robochamps') || subcategoryName.includes('rc')) {
          type = 'RoboChamps'
        }
      }
      
      // 格式化 grade level
      let gradeLevel = ''
      if (course.grade_level) {
        gradeLevel = course.grade_level
      } else if (course.age_min !== undefined && course.age_max !== undefined) {
        // 根据年龄估算年级（简单映射）
        if (course.age_min <= 5 && course.age_max <= 7) {
          gradeLevel = 'K-2'
        } else if (course.age_min <= 8 && course.age_max <= 10) {
          gradeLevel = '3-5'
        } else if (course.age_min <= 11 && course.age_max <= 13) {
          gradeLevel = '6-8'
        } else {
          gradeLevel = `${course.age_min}-${course.age_max}`
        }
      }
      
      return {
        id: course.id,
        title: course.name,
        type: type || undefined,
        gradeLevel: gradeLevel || 'All',
        description: course.description || undefined,
        slug: course.slug || undefined,
      }
    })
    
    return NextResponse.json(mappedCourses)
  } catch (error: any) {
    console.error("Error fetching featured courses:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch featured courses" },
      { status: 500 }
    )
  }
}

