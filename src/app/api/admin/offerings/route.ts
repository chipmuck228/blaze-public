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
        .eq("id", offeringId)
        .single()

      if (error) {
        throw new Error(error.message)
      }

      if (!offering) {
        return NextResponse.json({ error: "Offering not found" }, { status: 404 })
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
    }

    // 获取所有 offerings
    let query = supabaseAdmin
      .from("offerings")
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
        const { data: subcategoryTags } = await supabaseAdmin
          .from('course_subcategory_tags')
          .select('subcategory_id')
          .eq('course_id', offering.id) // 使用 course_id 字段（向后兼容）

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

    // 创建 offering（默认状态为 draft）
    const { data: offering, error: createError } = await supabaseAdmin
      .from("offerings")
      .insert({
        name,
        slug,
        description,
        target_audience,
        learning_outcomes,
        prerequisites,
        cancellation_policy,
        session_count,
        number_of_sessions: session_count, // 向后兼容
        age_min,
        age_max,
        target_age_min: age_min, // 向后兼容
        target_age_max: age_max, // 向后兼容
        target_grades,
        grade_level,
        base_price,
        currency: currency || "USD",
        duration_hours,
        poster_url: poster_url || null,
        offering_type,
        type_config: type_config || {},
        status: 'draft',  // 新创建的 offering 默认为 draft 状态
        is_active: false, // draft 状态时 is_active 为 false
      })
      .select()
      .single()

    if (createError) {
      throw new Error(createError.message)
    }

    // 如果有子类标签，添加标签（使用 course_id 字段，向后兼容）
    if (subcategory_ids && Array.isArray(subcategory_ids) && subcategory_ids.length > 0) {
      const tagsToInsert = subcategory_ids.map((subcategoryId: string) => ({
        course_id: offering.id,
        subcategory_id: subcategoryId,
      }))

      const { error: tagsError } = await supabaseAdmin
        .from('course_subcategory_tags')
        .insert(tagsToInsert)

      if (tagsError) {
        console.error("Error adding subcategory tags:", tagsError)
        // 不抛出错误，继续执行
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
      .eq("id", offering.id)
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
    }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating offering:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create offering" },
      { status: 500 }
    )
  }
}

