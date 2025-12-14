import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getEnrollmentById } from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase"

// GET: 获取单个注册详情（包含历史）
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
    const enrollment = await getEnrollmentById(id)

    if (!enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      )
    }

    // 获取状态历史
    const { data: history } = await supabaseAdmin
      .from("enrollment_status_history")
      .select("*")
      .eq("enrollment_id", id)
      .order("created_at", { ascending: true })

    return NextResponse.json({
      ...enrollment,
      history: history || [],
    })
  } catch (error: any) {
    console.error("Error fetching enrollment:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch enrollment" },
      { status: 500 }
    )
  }
}

// PATCH: 更新注册状态（管理员操作）
export async function PATCH(
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
    const { status, payment_status, reason, notes } = body

    // 获取当前注册信息
    const enrollment = await getEnrollmentById(id)
    if (!enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      )
    }

    // 构建更新对象
    const updates: any = {
      updated_at: new Date().toISOString(),
    }

    if (status) {
      updates.status = status
      // 根据新状态设置相应的时间字段
      if (status === "cancelled") {
        updates.cancelled_at = new Date().toISOString()
        updates.cancelled_reason = reason || "Cancelled by admin"
      } else if (status === "enrolled" && enrollment.status !== "enrolled") {
        updates.enrolled_at = new Date().toISOString()
      } else if (status === "completed") {
        // 可以添加 completed_at 字段（如果数据库有）
      }
    }

    if (payment_status) {
      updates.payment_status = payment_status
    }

    if (notes) {
      updates.notes = notes
    }

    // 更新注册
    const { data, error } = await supabaseAdmin
      .from("course_enrollments")
      .update(updates)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    // 状态历史会由触发器自动记录，但我们可以手动添加一条记录说明是管理员操作
    if (status && status !== enrollment.status) {
      await supabaseAdmin.from("enrollment_status_history").insert({
        enrollment_id: id,
        from_status: enrollment.status,
        to_status: status,
        changed_by: session.user.id,
        change_reason: reason || "Status changed by admin",
        metadata: {
          admin_action: true,
          admin_id: session.user.id,
          notes,
        },
      })
    }

    return NextResponse.json({
      enrollment: data,
      message: "Enrollment updated successfully",
    })
  } catch (error: any) {
    console.error("Error updating enrollment:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update enrollment" },
      { status: 500 }
    )
  }
}

