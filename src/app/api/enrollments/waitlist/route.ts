import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { addToInstanceWaitlist, getUserInstanceWaitlist } from "@/lib/db"
import { isStudentAccount } from "@/lib/permissions"

// GET /api/enrollments/waitlist - 获取用户的等待列表
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const waitlist = await getUserInstanceWaitlist(session.user.id)

    return NextResponse.json({
      waitlist,
      total: waitlist.length,
    })
  } catch (error: unknown) {
    console.error("Error fetching waitlist:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch waitlist" },
      { status: 500 }
    )
  }
}

// POST /api/enrollments/waitlist - 加入等待列表
export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const body = await request.json()
    const { 
      instance_id, 
      student_id, 
      student_name, 
      student_birth_date 
    } = body

    if (!instance_id) {
      return NextResponse.json(
        { error: "instance_id is required" },
        { status: 400 }
      )
    }

    if (!student_name) {
      return NextResponse.json(
        { error: "student_name is required" },
        { status: 400 }
      )
    }

    try {
      const enrollment = await addToInstanceWaitlist(
        userId,
        instance_id,
        student_id || null,
        student_name,
        student_birth_date
      )

      return NextResponse.json({
        enrollment,
        message: "Added to waitlist successfully",
      })
    } catch (error: unknown) {
      // 如果已存在注册，返回特殊错误码
      if (getErrorMessage(error).includes('already has an active enrollment')) {
        return NextResponse.json(
          {
            error: getErrorMessage(error),
            code: "ALREADY_ENROLLED",
          },
          { status: 409 }
        )
      }

      // 如果已在等待列表，返回特殊错误码
      if (getErrorMessage(error).includes('already on the waitlist')) {
        return NextResponse.json(
          {
            error: getErrorMessage(error),
            code: "ALREADY_WAITLISTED",
          },
          { status: 409 }
        )
      }

      // 如果容量未满，返回特殊错误码
      if (getErrorMessage(error).includes('has available capacity')) {
        return NextResponse.json(
          {
            error: getErrorMessage(error),
            code: "CAPACITY_AVAILABLE",
          },
          { status: 400 }
        )
      }

      // 如果先修条件不满足，返回特殊错误码
      if (getErrorMessage(error).includes('Prerequisites not met')) {
        return NextResponse.json(
          {
            error: getErrorMessage(error),
            code: "PREREQUISITES_NOT_MET",
          },
          { status: 403 }
        )
      }

      throw error
    }
  } catch (error: unknown) {
    console.error("Error adding to waitlist:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to add to waitlist" },
      { status: 500 }
    )
  }
}
