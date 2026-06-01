import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"

// DELETE /api/enrollments/cart/:id - 删除购物车项（支持同步项删除）
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const userId = session.user.id
    const { id } = await params
    
    // 1. 获取enrollment信息
    const { data: enrollment, error: fetchError } = await supabaseAdmin
      .from('instance_enrollments')
      .select('*')
      .eq('id', id)
      .single()
    
    if (fetchError || !enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      )
    }
    
    // 2. 验证权限
    if (enrollment.user_id !== userId && enrollment.sync_from_user_id !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }
    
    // 3. 验证状态
    if (enrollment.status !== 'cart') {
      return NextResponse.json(
        { error: "Enrollment is not in cart" },
        { status: 400 }
      )
    }
    
    // 4. 删除逻辑
    if (enrollment.is_synced === false) {
      // 删除原始项，同时删除所有同步项
      const { error: deleteOriginalError } = await supabaseAdmin
        .from('instance_enrollments')
        .delete()
        .eq('id', id)
      
      if (deleteOriginalError) {
        throw deleteOriginalError
      }
      
      // 删除所有同步项
      const { error: deleteSyncError } = await supabaseAdmin
        .from('instance_enrollments')
        .delete()
        .eq('sync_from_user_id', enrollment.user_id)
        .eq('student_id', enrollment.student_id)
        .eq('instance_id', enrollment.instance_id)
        .eq('is_synced', true)
        .eq('status', 'cart')
      
      if (deleteSyncError) {
        console.error('Failed to delete synced items:', deleteSyncError)
        // 不抛出错误，因为原始项已删除
      }
    } else {
      // 删除同步项，同时删除原始项
      const { error: deleteSyncError } = await supabaseAdmin
        .from('instance_enrollments')
        .delete()
        .eq('id', id)
      
      if (deleteSyncError) {
        throw deleteSyncError
      }
      
      // 删除原始项
      const { error: deleteOriginalError } = await supabaseAdmin
        .from('instance_enrollments')
        .delete()
        .eq('user_id', enrollment.sync_from_user_id)
        .eq('student_id', enrollment.student_id)
        .eq('instance_id', enrollment.instance_id)
        .eq('is_synced', false)
        .eq('status', 'cart')
      
      if (deleteOriginalError) {
        console.error('Failed to delete original item:', deleteOriginalError)
        // 不抛出错误，因为同步项已删除
      }
    }
    
    return NextResponse.json({
      message: "Removed from cart successfully"
    })
  } catch (error: unknown) {
    console.error("Error removing from cart:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to remove from cart" },
      { status: 500 }
    )
  }
}
