import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// 获取单个 campus
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabaseAdmin
      .from("blaze_campus")
      .select(`
        *,
        franchise:blaze_franchise(
          id,
          code,
          name
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Campus not found" }, { status: 404 })
      }
      throw new Error(error.message)
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching campus:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch campus" },
      { status: 500 }
    )
  }
}

// 更新 campus
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    if (franchise_id) {
      // 验证 franchise_id 存在于 blaze_franchise 表中
      const { data: franchise, error: franchiseError } = await supabaseAdmin
        .from("blaze_franchise")
        .select("id")
        .eq("id", franchise_id)
        .single()

      if (franchiseError || !franchise) {
        return NextResponse.json(
          { error: "Invalid franchise_id. Franchise must exist in blaze_franchise table." },
          { status: 400 }
        )
      }
    }

    const updateData: any = {
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
      updated_at: new Date().toISOString(),
    }

    if (franchise_id !== undefined) {
      updateData.franchise_id = franchise_id
    }

    if (is_active !== undefined) {
      updateData.is_active = is_active
    }

    const { data, error } = await supabaseAdmin
      .from("blaze_campus")
      .update(updateData)
      .eq("id", id)
      .select(`
        *,
        franchise:blaze_franchise(
          id,
          code,
          name
        )
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Campus not found" }, { status: 404 })
      }
      console.error("Error updating campus:", error)
      return NextResponse.json(
        { error: error.message || "Failed to update campus" },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 200 })
  } catch (error: any) {
    console.error("Error updating campus:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update campus" },
      { status: 500 }
    )
  }
}

// 删除 campus
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 检查是否有实例使用此 campus
    const { data: instances, error: instancesError } = await supabaseAdmin
      .from("blaze_instance")
      .select("id")
      .eq("campus_id", id)
      .limit(1)

    if (instancesError) {
      console.error("Error checking instances:", instancesError)
    }

    if (instances && instances.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete campus. There are instances using this campus." },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("blaze_campus")
      .delete()
      .eq("id", id)

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: "Campus not found" }, { status: 404 })
      }
      console.error("Error deleting campus:", error)
      return NextResponse.json(
        { error: error.message || "Failed to delete campus" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Campus deleted successfully" }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting campus:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete campus" },
      { status: 500 }
    )
  }
}
