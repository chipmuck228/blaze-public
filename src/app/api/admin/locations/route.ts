import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取所有 campuses（支持按 franchiseId 筛选）
// 使用新的 campuses 表，关联 franchises_v2
// 管理页面需要显示所有记录（包括 inactive），所以不默认过滤 is_active
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const franchiseId = searchParams.get("franchiseId")
    const activeOnly = searchParams.get("activeOnly") === "true"

    let query = supabaseAdmin
      .from("campuses")
      .select("*")
      .order("name", { ascending: true })

    // 如果指定了 activeOnly=true，只返回 active 的 campuses
    // 否则返回所有 campuses（管理页面需要显示所有记录）
    if (activeOnly) {
      query = query.eq("is_active", true)
    }

    // 如果提供了 franchiseId，只返回属于该 franchise 的 campuses
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
// 使用新的 campuses 表，franchise_id 必须引用 franchises_v2
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { 
      name, 
      address, 
      city, 
      state, 
      zip_code, 
      description,
      phone, 
      email, 
      parking_info,
      check_in_info,
      amenities,
      franchise_id 
    } = body

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      )
    }

    // 如果提供了 franchise_id，验证它存在于 franchises_v2 表中
    if (franchise_id) {
      const { data: franchise, error: franchiseError } = await supabaseAdmin
        .from("franchises_v2")
        .select("id")
        .eq("id", franchise_id)
        .single()

      if (franchiseError || !franchise) {
        return NextResponse.json(
          { error: "Invalid franchise_id. Franchise must exist in franchises_v2 table." },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabaseAdmin
      .from("campuses")
      .insert({
        name,
        address: address || null,
        city: city || null,
        state: state || null,
        zip_code: zip_code || null,
        description: description || null,
        phone: phone || null,
        email: email || null,
        parking_info: parking_info || null,
        check_in_info: check_in_info || null,
        amenities: amenities || null,
        franchise_id: franchise_id || null,
        is_active: true,
      })
      .select()
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

