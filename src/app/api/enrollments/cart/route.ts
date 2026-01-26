import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { addToCart, getUserCart, checkUserPrerequisites } from "@/lib/db"
import { supabaseAdmin } from "@/lib/supabase"

// GET: 获取用户的注册清单
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const cart = await getUserCart(session.user.id)

    // 计算每个项目的剩余时间
    const cartWithTimeRemaining = cart.map(item => {
      const expiresAt = item.cart_expires_at ? new Date(item.cart_expires_at) : null
      const timeRemaining = expiresAt 
        ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
        : 0

      return {
        ...item,
        time_remaining: timeRemaining,
      }
    })

    return NextResponse.json({
      items: cartWithTimeRemaining,
      total: cartWithTimeRemaining.length,
    })
  } catch (error: any) {
    console.error("Error fetching cart:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch cart" },
      { status: 500 }
    )
  }
}

// POST: 将课程实例加入注册清单
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { instance_id, notes } = body

    if (!instance_id) {
      return NextResponse.json(
        { error: "instance_id is required" },
        { status: 400 }
      )
    }

    // 获取实例关联的课程ID，检查先修条件
    try {
      const { data: instance } = await supabaseAdmin
        .from('course_instances')
        .select(`
          assignment_id,
          assignment:course_assignments(
            course_id
          )
        `)
        .eq('id', instance_id)
        .single()

      if (instance?.assignment) {
        // assignment 可能是数组或单个对象，需要处理
        const assignment = Array.isArray(instance.assignment) 
          ? instance.assignment[0] 
          : instance.assignment
        const courseId = (assignment as any)?.course_id

        if (courseId) {
          const prerequisiteCheck = await checkUserPrerequisites(session.user.id, courseId)
          
          if (!prerequisiteCheck.canEnroll) {
            const missingCourses = prerequisiteCheck.missingPrerequisites || []
            const courseNames = missingCourses.map((c: any) => c.name).join(', ')
            return NextResponse.json(
              {
                error: `You need to complete the following prerequisite courses first: ${courseNames}`,
                code: "PREREQUISITES_NOT_MET",
                missingPrerequisites: missingCourses,
              },
              { status: 403 }
            )
          }
        }
      }
    } catch (prereqError: any) {
      // 如果检查先修条件失败，记录错误但继续（保守处理）
      console.error('Error checking prerequisites:', prereqError)
    }

    try {
      // 添加调试日志：记录添加购物车请求
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Cart API] Adding instance ${instance_id} to cart for user ${session.user.id}`)
      }
      
      const enrollment = await addToCart(session.user.id, instance_id, notes)

      return NextResponse.json({
        enrollment,
        message: "Added to cart successfully",
      })
    } catch (error: any) {
      // 添加调试日志：记录错误详情
      if (process.env.NODE_ENV === 'development') {
        console.error(`[Cart API] Error adding to cart:`, {
          instance_id,
          user_id: session.user.id,
          error_message: error.message,
          error_stack: error.stack,
        })
      }
      
      // 如果是容量不足，返回特殊错误码
      if (error.message.includes('full') || error.message.includes('capacity')) {
        return NextResponse.json(
          {
            error: error.message,
            code: "CAPACITY_FULL",
            suggestion: "waitlist",
          },
          { status: 409 }
        )
      }

      // 如果已存在注册，返回特殊错误码
      if (error.message.includes('Already have')) {
        return NextResponse.json(
          {
            error: error.message,
            code: "ALREADY_ENROLLED",
          },
          { status: 409 }
        )
      }

      throw error
    }
  } catch (error: any) {
    console.error("Error adding to cart:", error)
    return NextResponse.json(
      { error: error.message || "Failed to add to cart" },
      { status: 500 }
    )
  }
}

