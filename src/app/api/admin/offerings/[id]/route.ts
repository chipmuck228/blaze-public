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
      .from("offerings_v2")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Offering not found" }, { status: 404 })
      }
      throw new Error(error.message)
    }

    // 查询标签（只查询 offering_id，因为 offerings_v2 表中的 offering 不在 courses 表中）
    const { data: offeringTagsResult } = await supabaseAdmin
      .from('course_subcategory_tags')
      .select('subcategory_id')
      .eq('offering_id', id)
    
    const subcategoryTags = offeringTagsResult || []

    let tags: Array<{ id: string; name: string; display_name: string }> = []
    if (subcategoryTags && subcategoryTags.length > 0) {
      const subcategoryIds = subcategoryTags.map(t => t.subcategory_id)
      const { data: subcategoriesData } = await supabaseAdmin
        .from('course_subcategories')
        .select('id, name, display_name')
        .in('id', subcategoryIds)
        .eq('is_active', true)
      
      if (subcategoriesData) {
        tags = subcategoriesData.map((s: any) => ({
          id: s.id,
          name: s.name,
          display_name: s.display_name,
        }))
      }
    }

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
      cancellation_policy, // 注意：offerings_v2 表不包含此字段，但保留以兼容前端
      session_count, // 注意：offerings_v2 表不包含此字段，但保留以兼容前端
      age_min, // 注意：offerings_v2 表不包含此字段，但保留以兼容前端
      age_max, // 注意：offerings_v2 表不包含此字段，但保留以兼容前端
      target_grades, // 注意：offerings_v2 表不包含此字段，但保留以兼容前端
      grade_level, // 注意：offerings_v2 表不包含此字段，但保留以兼容前端
      base_price,
      currency,
      duration_hours, // 注意：offerings_v2 表不包含此字段，但保留以兼容前端
      poster_url,
      offering_type,
      type_config,
      status,
      subcategory_ids,
    } = body

    // 更新 offering_v2（只包含 offerings_v2 表支持的字段）
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (slug !== undefined) updateData.slug = slug
    if (description !== undefined) updateData.description = description
    if (target_audience !== undefined) updateData.target_audience = target_audience
    if (learning_outcomes !== undefined) updateData.learning_outcomes = learning_outcomes
    if (prerequisites !== undefined) updateData.prerequisites = prerequisites
    // cancellation_policy 已移到 franchise 级别，不再存储在 offering 中
    // session_count, age_min, age_max, target_grades, grade_level, duration_hours 在 instance 级别
    if (base_price !== undefined) updateData.base_price = base_price
    if (currency !== undefined) updateData.currency = currency
    if (poster_url !== undefined) updateData.poster_url = poster_url
    if (offering_type !== undefined) updateData.offering_type = offering_type
    if (type_config !== undefined) updateData.type_config = type_config
    if (status !== undefined) updateData.status = status
    // offerings_v2 表不包含 is_active 字段

    const { data: offering, error: updateError } = await supabaseAdmin
      .from("offerings_v2")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      throw new Error(updateError.message)
    }

    // 如果有子类标签，更新标签
    if (subcategory_ids !== undefined) {
      // 先删除所有现有标签（只删除 offering_id 的记录）
      await supabaseAdmin
        .from('course_subcategory_tags')
        .delete()
        .eq('offering_id', id)

      // 然后添加新标签（使用 offering_id）
      if (Array.isArray(subcategory_ids) && subcategory_ids.length > 0) {
        const tagsToInsert = subcategory_ids.map((subcategoryId: string) => ({
          offering_id: id,  // 使用 offering_id
          course_id: null,  // course_id 设为 null
          subcategory_id: subcategoryId,
        }))

        const { error: tagsError } = await supabaseAdmin
          .from('course_subcategory_tags')
          .insert(tagsToInsert)

        if (tagsError) {
          console.error("Error updating subcategory tags:", tagsError)
          throw new Error(`Failed to update subcategory tags: ${tagsError.message}`)
        }
      }
    }

    // 返回完整的 offering 信息（包含标签）
    // 只查询 offering_id 的标签（offerings_v2 表中的 offering 不在 courses 表中）
    const { data: offeringTagsResult } = await supabaseAdmin
      .from('course_subcategory_tags')
      .select('subcategory_id')
      .eq('offering_id', id)
    
    const subcategoryTags = offeringTagsResult || []

    let tags: Array<{ id: string; name: string; display_name: string }> = []
    if (subcategoryTags.length > 0) {
      const subcategoryIds = subcategoryTags.map(t => t.subcategory_id)
      const { data: subcategoriesData } = await supabaseAdmin
        .from('course_subcategories')
        .select('id, name, display_name')
        .in('id', subcategoryIds)
        .eq('is_active', true)
      
      if (subcategoriesData) {
        tags = subcategoriesData.map((s: any) => ({
          id: s.id,
          name: s.name,
          display_name: s.display_name,
        }))
      }
    }

    return NextResponse.json({
      ...offering,
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
      .from("offerings_v2")
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

