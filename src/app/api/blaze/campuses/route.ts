import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有 campuses（支持按 franchiseId 筛选）
// 使用 v2_campus 表，关联 v2_franchise
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const franchiseId = searchParams.get("franchise_id")
    const activeOnly = searchParams.get("activeOnly") === "true"

    let query = supabaseAdmin
      .from("v2_campus")
      .select(`
        *,
        franchise:v2_franchise(
          id,
          code,
          name
        )
      `)
      .order("name", { ascending: true })

    // 如果指定了 activeOnly=true，只返回 active 的 campuses
    if (activeOnly) {
      query = query.eq("is_active", true)
    }

    // 如果提供了 franchise_id，只返回属于该 franchise 的 campuses
    if (franchiseId) {
      query = query.eq("franchise_id", franchiseId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch campuses: ${error.message}`)
    }

    return NextResponse.json(data || [], { status: 200 })
  } catch (error: any) {
    console.error("Error fetching campuses:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch campuses" },
      { status: 500 }
    )
  }
}

// 创建新 campus
// 使用 v2_campus 表，franchise_id 必须引用 v2_franchise
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { 
      franchise_id,
      name, 
      display_name,
      address, 
      city, 
      state, 
      zip_code,
      country,
      phone, 
      email, 
      latitude,
      longitude,
      is_active
    } = body

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      )
    }

    if (!display_name) {
      return NextResponse.json(
        { error: "Missing required field: display_name" },
        { status: 400 }
      )
    }

    if (!franchise_id) {
      return NextResponse.json(
        { error: "Missing required field: franchise_id" },
        { status: 400 }
      )
    }

    // 验证 franchise_id 存在于 v2_franchise 表中
    const { data: franchise, error: franchiseError } = await supabaseAdmin
      .from("v2_franchise")
      .select("id")
      .eq("id", franchise_id)
      .single()

    if (franchiseError || !franchise) {
      return NextResponse.json(
        { error: "Invalid franchise_id. Franchise must exist in v2_franchise table." },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("v2_campus")
      .insert({
        franchise_id,
        name,
        display_name: display_name || name,
        address: address || null,
        city: city || null,
        state: state || null,
        zip_code: zip_code || null,
        country: country || 'US',
        phone: phone || null,
        email: email || null,
        latitude: latitude || null,
        longitude: longitude || null,
        is_active: is_active !== undefined ? is_active : true,
      })
      .select(`
        *,
        franchise:v2_franchise(
          id,
          code,
          name
        )
      `)
      .single()

    if (error) {
      console.error("Error creating campus:", error)
      return NextResponse.json(
        { error: error.message || "Failed to create campus" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error("Error creating campus:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create campus" },
      { status: 500 }
    )
  }
}
