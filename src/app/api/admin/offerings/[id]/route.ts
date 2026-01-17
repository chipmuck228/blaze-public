import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取单个 offering
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const { data: offering, error } = await supabaseAdmin
      .from("offerings")
      .select(`
        *,
        subcategories:course_subcategory_tags(
          subcategory:course_subcategories(
            id,
            name,
            display_name
          )
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Offering not found" }, { status: 404 })
      }
      throw new Error(error.message)
    }

    // 转换 subcategories 格式
    const tags = (offering.subcategories || []).map((tag: any) => ({
      id: tag.subcategory.id,
      name: tag.subcategory.name,
      display_name: tag.subcategory.display_name,
    }))

    return NextResponse.json({
      ...offering,
      tags,
    }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching offering:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch offering" },
      { status: 500 }
    )
  }
}

// 更新 offering
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      name,
      slug,
      description,
      target_audience,
      learning_outcomes,
      prerequisites,
      cancellation_policy,
      session_count,
      age_min,
      age_max,
      target_grades,
      grade_level,
      base_price,
      currency,
      duration_hours,
      poster_url,
      offering_type,
      type_config,
      status,
      subcategory_ids,
    } = body

    // 更新 offering
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (slug !== undefined) updateData.slug = slug
    if (description !== undefined) updateData.description = description
    if (target_audience !== undefined) updateData.target_audience = target_audience
    if (learning_outcomes !== undefined) updateData.learning_outcomes = learning_outcomes
    if (prerequisites !== undefined) updateData.prerequisites = prerequisites
    if (cancellation_policy !== undefined) updateData.cancellation_policy = cancellation_policy
    if (session_count !== undefined) {
      updateData.session_count = session_count
      updateData.number_of_sessions = session_count // 向后兼容
    }
    if (age_min !== undefined) {
      updateData.age_min = age_min
      updateData.target_age_min = age_min // 向后兼容
    }
    if (age_max !== undefined) {
      updateData.age_max = age_max
      updateData.target_age_max = age_max // 向后兼容
    }
    if (target_grades !== undefined) updateData.target_grades = target_grades
    if (grade_level !== undefined) updateData.grade_level = grade_level
    if (base_price !== undefined) updateData.base_price = base_price
    if (currency !== undefined) updateData.currency = currency
    if (duration_hours !== undefined) updateData.duration_hours = duration_hours
    if (poster_url !== undefined) updateData.poster_url = poster_url
    if (offering_type !== undefined) updateData.offering_type = offering_type
    if (type_config !== undefined) updateData.type_config = type_config
    if (status !== undefined) {
      updateData.status = status
      // 根据 status 更新 is_active
      updateData.is_active = status === 'published'
    }

    const { data: offering, error: updateError } = await supabaseAdmin
      .from("offerings")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      throw new Error(updateError.message)
    }

    // 如果有子类标签，更新标签
    if (subcategory_ids !== undefined) {
      // 先删除所有现有标签
      await supabaseAdmin
        .from('course_subcategory_tags')
        .delete()
        .eq('course_id', id)

      // 然后添加新标签
      if (Array.isArray(subcategory_ids) && subcategory_ids.length > 0) {
        const tagsToInsert = subcategory_ids.map((subcategoryId: string) => ({
          course_id: id,
          subcategory_id: subcategoryId,
        }))

        const { error: tagsError } = await supabaseAdmin
          .from('course_subcategory_tags')
          .insert(tagsToInsert)

        if (tagsError) {
          console.error("Error updating subcategory tags:", tagsError)
          // 不抛出错误，继续执行
        }
      }
    }

    // 返回完整的 offering 信息（包含标签）
    const { data: offeringWithTags, error: fetchError } = await supabaseAdmin
      .from("offerings")
      .select(`
        *,
        subcategories:course_subcategory_tags(
          subcategory:course_subcategories(
            id,
            name,
            display_name
          )
        )
      `)
      .eq("id", id)
      .single()

    if (fetchError) {
      throw new Error(fetchError.message)
    }

    // 转换 subcategories 格式
    const tags = (offeringWithTags?.subcategories || []).map((tag: any) => ({
      id: tag.subcategory.id,
      name: tag.subcategory.name,
      display_name: tag.subcategory.display_name,
    }))

    return NextResponse.json({
      ...offeringWithTags,
      tags,
    }, { status: 200 })
  } catch (error: any) {
    console.error("Error updating offering:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update offering" },
      { status: 500 }
    )
  }
}

// 删除 offering
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const { error } = await supabaseAdmin
      .from("offerings")
      .delete()
      .eq("id", id)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting offering:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete offering" },
      { status: 500 }
    )
  }
}

