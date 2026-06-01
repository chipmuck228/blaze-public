/**
 * Archived V1 learning_paths DB layer (see _archive/LEGACY_MANIFEST.md).
 * Reference only — not imported from active src/ (tsconfig excludes _archive).
 */
import { supabaseAdmin } from "@/lib/supabase"
import type { Course, CourseCategory } from "@/lib/db"
import { checkUserPrerequisites, getUserCompletedCourseIds } from "@/lib/db"

// 学习路径相关接口
export interface LearningPath {
  id: string
  name: string
  slug?: string
  description?: string
  category_id?: string | null
  target_audience?: string
  estimated_duration_weeks?: number
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
  is_active: boolean
  display_order: number
  created_at: string
  updated_at: string
  category?: CourseCategory // 关联的课程大类
  courses?: LearningPathCourse[] // 路径中的课程
}

export interface LearningPathCourse {
  id: string
  path_id: string
  course_id: string
  stage: number
  stage_name?: string | null
  is_required: boolean
  is_parallel: boolean
  display_order: number
  estimated_weeks?: number | null
  notes?: string | null
  created_at: string
  updated_at: string
  course?: Course // 关联的课程详情
}

export interface LearningPathWithDetails extends LearningPath {
  courses: LearningPathCourse[]
}

export interface UserLearningPathProgress {
  id: string
  user_id: string
  path_id: string
  current_stage: number
  completed_courses_count: number
  total_courses_count: number
  started_at: string
  last_activity_at?: string | null
  completed_at?: string | null
  is_completed: boolean
  created_at: string
  updated_at: string
  path?: LearningPath // 关联的学习路径详情
}

// ==================== Learning Paths 操作 ====================

// 获取所有学习路径
export async function getAllLearningPaths(
  filters?: {
    category_id?: string
    is_active?: boolean
    difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
  }
): Promise<LearningPathWithDetails[]> {
  let query = supabaseAdmin
    .from('learning_paths')
    .select(`
      *,
      category:course_categories(*)
    `)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (filters?.category_id) {
    query = query.eq('category_id', filters.category_id)
  }
  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }
  if (filters?.difficulty_level) {
    query = query.eq('difficulty_level', filters.difficulty_level)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch learning paths: ${error.message}`)
  }

  // 获取每个路径的课程
  const pathsWithCourses: LearningPathWithDetails[] = []
  if (data) {
    for (const path of data) {
      const { data: coursesData } = await supabaseAdmin
        .from('learning_path_courses')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('path_id', path.id)
        .order('stage', { ascending: true })
        .order('display_order', { ascending: true })

      const courses = (coursesData || []).map((item: any) => ({
        ...item,
        course: Array.isArray(item.course) ? item.course[0] : item.course,
      })) as LearningPathCourse[]

      pathsWithCourses.push({
        ...path,
        category: Array.isArray(path.category) ? path.category[0] : path.category,
        courses,
      } as LearningPathWithDetails)
    }
  }

  return pathsWithCourses
}

// 根据 ID 获取学习路径
export async function getLearningPathById(pathId: string): Promise<LearningPathWithDetails | null> {
  const { data: path, error: pathError } = await supabaseAdmin
    .from('learning_paths')
    .select(`
      *,
      category:course_categories(*)
    `)
    .eq('id', pathId)
    .single()

  if (pathError || !path) {
    return null
  }

  // 获取路径中的课程
  const { data: coursesData } = await supabaseAdmin
    .from('learning_path_courses')
    .select(`
      *,
      course:courses(*)
    `)
    .eq('path_id', pathId)
    .order('stage', { ascending: true })
    .order('display_order', { ascending: true })

  const courses = (coursesData || []).map((item: any) => ({
    ...item,
    course: Array.isArray(item.course) ? item.course[0] : item.course,
  })) as LearningPathCourse[]

  return {
    ...path,
    category: Array.isArray(path.category) ? path.category[0] : path.category,
    courses,
  } as LearningPathWithDetails
}

// 根据 slug 获取学习路径
export async function getLearningPathBySlug(slug: string): Promise<LearningPathWithDetails | null> {
  const { data: path, error: pathError } = await supabaseAdmin
    .from('learning_paths')
    .select(`
      *,
      category:course_categories(*)
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (pathError || !path) {
    return null
  }

  // 获取路径中的课程
  const { data: coursesData } = await supabaseAdmin
    .from('learning_path_courses')
    .select(`
      *,
      course:courses(*)
    `)
    .eq('path_id', path.id)
    .order('stage', { ascending: true })
    .order('display_order', { ascending: true })

  const courses = (coursesData || []).map((item: any) => ({
    ...item,
    course: Array.isArray(item.course) ? item.course[0] : item.course,
  })) as LearningPathCourse[]

  return {
    ...path,
    category: Array.isArray(path.category) ? path.category[0] : path.category,
    courses,
  } as LearningPathWithDetails
}

// 创建学习路径
export async function createLearningPath(
  path: Omit<LearningPath, 'id' | 'created_at' | 'updated_at' | 'category' | 'courses'>,
  courses?: Array<Omit<LearningPathCourse, 'id' | 'path_id' | 'created_at' | 'updated_at' | 'course'>>
): Promise<LearningPathWithDetails> {
  // 创建路径
  const { data: pathData, error: pathError } = await supabaseAdmin
    .from('learning_paths')
    .insert({
      name: path.name,
      slug: path.slug || null,
      description: path.description || null,
      category_id: path.category_id || null,
      target_audience: path.target_audience || null,
      estimated_duration_weeks: path.estimated_duration_weeks || null,
      difficulty_level: path.difficulty_level || null,
      is_active: path.is_active !== undefined ? path.is_active : true,
      display_order: path.display_order || 0,
    })
    .select()
    .single()

  if (pathError || !pathData) {
    throw new Error(`Failed to create learning path: ${pathError?.message || 'Unknown error'}`)
  }

  // 如果有课程，创建路径课程关联
  if (courses && courses.length > 0) {
    const pathCourses = courses.map(course => ({
      path_id: pathData.id,
      course_id: course.course_id,
      stage: course.stage,
      stage_name: course.stage_name || null,
      is_required: course.is_required !== undefined ? course.is_required : true,
      is_parallel: course.is_parallel !== undefined ? course.is_parallel : false,
      display_order: course.display_order || 0,
      estimated_weeks: course.estimated_weeks || null,
      notes: course.notes || null,
    }))

    const { error: coursesError } = await supabaseAdmin
      .from('learning_path_courses')
      .insert(pathCourses)

    if (coursesError) {
      // 如果创建课程失败，删除已创建的路径
      await supabaseAdmin.from('learning_paths').delete().eq('id', pathData.id)
      throw new Error(`Failed to create path courses: ${coursesError.message}`)
    }
  }

  // 返回完整路径（包含课程）
  const fullPath = await getLearningPathById(pathData.id)
  if (!fullPath) {
    throw new Error('Failed to fetch created learning path')
  }

  return fullPath
}

// 更新学习路径
export async function updateLearningPath(
  pathId: string,
  updates: Partial<Omit<LearningPath, 'id' | 'created_at' | 'updated_at' | 'category' | 'courses'>>,
  courses?: Array<Omit<LearningPathCourse, 'id' | 'path_id' | 'created_at' | 'updated_at' | 'course'>>
): Promise<LearningPathWithDetails> {
  // 更新路径基本信息
  const updateData: any = {}
  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.slug !== undefined) updateData.slug = updates.slug
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.category_id !== undefined) updateData.category_id = updates.category_id
  if (updates.target_audience !== undefined) updateData.target_audience = updates.target_audience
  if (updates.estimated_duration_weeks !== undefined) updateData.estimated_duration_weeks = updates.estimated_duration_weeks
  if (updates.difficulty_level !== undefined) updateData.difficulty_level = updates.difficulty_level
  if (updates.is_active !== undefined) updateData.is_active = updates.is_active
  if (updates.display_order !== undefined) updateData.display_order = updates.display_order

  if (Object.keys(updateData).length > 0) {
    const { error: pathError } = await supabaseAdmin
      .from('learning_paths')
      .update(updateData)
      .eq('id', pathId)

    if (pathError) {
      throw new Error(`Failed to update learning path: ${pathError.message}`)
    }
  }

  // 如果提供了课程列表，更新路径课程
  if (courses !== undefined) {
    // 删除现有课程关联
    const { error: deleteError } = await supabaseAdmin
      .from('learning_path_courses')
      .delete()
      .eq('path_id', pathId)

    if (deleteError) {
      throw new Error(`Failed to delete existing path courses: ${deleteError.message}`)
    }

    // 创建新的课程关联
    if (courses.length > 0) {
      const pathCourses = courses.map(course => ({
        path_id: pathId,
        course_id: course.course_id,
        stage: course.stage,
        stage_name: course.stage_name || null,
        is_required: course.is_required !== undefined ? course.is_required : true,
        is_parallel: course.is_parallel !== undefined ? course.is_parallel : false,
        display_order: course.display_order || 0,
        estimated_weeks: course.estimated_weeks || null,
        notes: course.notes || null,
      }))

      const { error: coursesError } = await supabaseAdmin
        .from('learning_path_courses')
        .insert(pathCourses)

      if (coursesError) {
        throw new Error(`Failed to create path courses: ${coursesError.message}`)
      }
    }
  }

  // 返回更新后的完整路径
  const fullPath = await getLearningPathById(pathId)
  if (!fullPath) {
    throw new Error('Failed to fetch updated learning path')
  }

  return fullPath
}

// 删除学习路径
export async function deleteLearningPath(pathId: string): Promise<boolean> {
  // 由于有 CASCADE 删除，只需要删除路径即可
  const { error } = await supabaseAdmin
    .from('learning_paths')
    .delete()
    .eq('id', pathId)

  if (error) {
    throw new Error(`Failed to delete learning path: ${error.message}`)
  }

  return true
}

// ==================== User Learning Path Progress 操作 ====================

// 获取用户的学习路径进度
export async function getUserLearningPathProgress(
  userId: string,
  pathId?: string
): Promise<UserLearningPathProgress[]> {
  let query = supabaseAdmin
    .from('user_learning_path_progress')
    .select(`
      *,
      path:learning_paths(*)
    `)
    .eq('user_id', userId)
    .order('last_activity_at', { ascending: false })

  if (pathId) {
    query = query.eq('path_id', pathId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch learning path progress: ${error.message}`)
  }

  return (data || []).map((item: any) => ({
    ...item,
    path: Array.isArray(item.path) ? item.path[0] : item.path,
  })) as UserLearningPathProgress[]
}

// 计算学习路径进度（实时计算，不依赖数据库）
export async function calculateLearningPathProgress(
  userId: string,
  pathId: string
): Promise<{
  progress: number
  currentStage: number
  completedStages: number
  totalStages: number
  nextCourses: Course[]
}> {
  const path = await getLearningPathById(pathId)
  if (!path || !path.courses) {
    throw new Error('Learning path not found')
  }

  const completedCourseIds = await getUserCompletedCourseIds(userId)

  // 计算总体进度
  const requiredCourses = path.courses.filter(pc => pc.is_required)
  const completedRequired = requiredCourses.filter(
    pc => pc.course_id && completedCourseIds.has(pc.course_id)
  )
  const progress = requiredCourses.length > 0
    ? Math.round((completedRequired.length / requiredCourses.length) * 100)
    : 0

  // 计算当前阶段
  const stages = [...new Set(path.courses.map(pc => pc.stage))].sort()
  let currentStage = 1
  for (const stage of stages) {
    const stageCourses = path.courses.filter(
      pc => pc.stage === stage && pc.is_required
    )
    const allCompleted = stageCourses.every(
      pc => pc.course_id && completedCourseIds.has(pc.course_id)
    )
    if (allCompleted) {
      currentStage = stage + 1
    } else {
      break
    }
  }

  // 获取下一阶段的课程（检查先修条件）
  const nextStageCourses = path.courses.filter(
    pc => pc.stage === currentStage && pc.is_required
  )

  const nextCourses: Course[] = []
  for (const pathCourse of nextStageCourses) {
    if (pathCourse.course_id && !completedCourseIds.has(pathCourse.course_id)) {
      const check = await checkUserPrerequisites(userId, pathCourse.course_id)
      if (check.canEnroll && pathCourse.course) {
        nextCourses.push(pathCourse.course)
      }
    }
  }

  return {
    progress,
    currentStage,
    completedStages: currentStage - 1,
    totalStages: stages.length,
    nextCourses: nextCourses.slice(0, 5), // 只返回前 5 个
  }
}
