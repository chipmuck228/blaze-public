import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有 offerings
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const offeringId = searchParams.get("offeringId")
    const search = searchParams.get("search")
    const offeringType = searchParams.get("offeringType")

    // 如果提供了 offeringId，返回单个 offering 的详细信息
    if (offeringId) {
      const { data: offering, error } = await supabaseAdmin
        .from("offerings_v2")
        .select("*")
        .eq("id", offeringId)
        .single()

      if (error) {
        throw new Error(error.message)
      }

      if (!offering) {
        return NextResponse.json({ error: "Offering not found" }, { status: 404 })
      }

      // 查询标签（只查询 offering_id，因为 offerings_v2 表中的 offering 不在 courses 表中）
      const { data: offeringTagsResult } = await supabaseAdmin
        .from('course_subcategory_tags')
        .select('subcategory_id')
        .eq('offering_id', offeringId)
      
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
    }

    // 获取所有 offerings（从 offerings_v2 表）
    let query = supabaseAdmin
      .from("offerings_v2")
      .select("*")
      .order("created_at", { ascending: false })

    // 如果提供了 offeringType，进行过滤
    if (offeringType) {
      query = query.eq("offering_type", offeringType)
    }

    const { data: offerings, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    // 如果提供了搜索参数，进行过滤
    let filteredOfferings = offerings || []
    if (search) {
      const searchLower = search.toLowerCase()
      filteredOfferings = filteredOfferings.filter(
        (offering) =>
          offering.name?.toLowerCase().includes(searchLower) ||
          offering.description?.toLowerCase().includes(searchLower) ||
          offering.slug?.toLowerCase().includes(searchLower)
      )
    }

    // 为每个 offering 加载 tags (subcategories)
    const offeringsWithTags = await Promise.all(
      filteredOfferings.map(async (offering) => {
        // 只查询 offering_id 的标签（offerings_v2 表中的 offering 不在 courses 表中）
        const { data: offeringTagsResult } = await supabaseAdmin
          .from('course_subcategory_tags')
          .select('subcategory_id')
          .eq('offering_id', offering.id)
        
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

        return {
          ...offering,
          tags,
        }
      })
    )

    return NextResponse.json(offeringsWithTags, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching offerings:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch offerings" },
      { status: 500 }
    )
  }
}

// 创建新 offering
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
      subcategory_ids, // 子类标签ID数组
    } = body

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      )
    }

    if (!offering_type) {
      return NextResponse.json(
        { error: "Missing required field: offering_type" },
        { status: 400 }
      )
    }

    // 创建 offering_v2（默认状态为 draft）
    // 注意：offerings_v2 表是简化版本，不包含 session_count, age_min, age_max 等字段
    // 这些字段应该在 instance 级别设置
    const { data: offering, error: createError } = await supabaseAdmin
      .from("offerings_v2")
      .insert({
        name,
        slug,
        description,
        target_audience,
        learning_outcomes,
        prerequisites,
        // cancellation_policy 已移到 franchise 级别，不再存储在 offering 中
        base_price,
        currency: currency || "USD",
        poster_url: poster_url || null,
        offering_type,
        type_config: type_config || {},
        status: 'draft',  // 新创建的 offering 默认为 draft 状态
        // 注意：offerings_v2 表不包含以下字段（这些字段在 instance 级别）：
        // - session_count, duration_hours (在 instance 级别)
        // - age_min, age_max (在 instance 级别)
        // - target_grades, grade_level (在 instance 级别)
        // - cancellation_policy (在 franchise 级别)
      })
      .select()
      .single()

    if (createError) {
      throw new Error(createError.message)
    }

    // 如果有子类标签，添加标签（使用 offering_id 字段）
    if (subcategory_ids && Array.isArray(subcategory_ids) && subcategory_ids.length > 0) {
      try {
        // 首先尝试使用 offering_id（新架构）
        const tagsToInsert = subcategory_ids.map((subcategoryId: string) => ({
          offering_id: offering.id,
          course_id: null,
          subcategory_id: subcategoryId,
        }))

        const { error: tagsError } = await supabaseAdmin
          .from('course_subcategory_tags')
          .insert(tagsToInsert)

        if (tagsError) {
          // 如果 offering_id 字段不存在，尝试使用 course_id（向后兼容）
          if (tagsError.message.includes('column') && tagsError.message.includes('offering_id')) {
            console.warn("offering_id column not found, using course_id as fallback")
            const fallbackTagsToInsert = subcategory_ids.map((subcategoryId: string) => ({
              course_id: offering.id,
              subcategory_id: subcategoryId,
            }))

            const { error: fallbackError } = await supabaseAdmin
              .from('course_subcategory_tags')
              .insert(fallbackTagsToInsert)

            if (fallbackError) {
              console.error("Error adding subcategory tags (fallback):", fallbackError)
              // 不抛出错误，允许继续执行（标签是可选的）
            }
          } else {
            console.error("Error adding subcategory tags:", tagsError)
            // 不抛出错误，允许继续执行（标签是可选的）
          }
        }
      } catch (err: any) {
        console.error("Error adding subcategory tags:", err)
        // 不抛出错误，允许继续执行（标签是可选的）
      }
    }

    // 返回完整的 offering 信息（包含标签）
    // 新创建的 offering 在 offerings_v2 表中，只查询 offering_id 的标签
    const { data: offeringTagsResult } = await supabaseAdmin
      .from('course_subcategory_tags')
      .select('subcategory_id')
      .eq('offering_id', offering.id)
    
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
    }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating offering:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create offering" },
      { status: 500 }
    )
  }
}

