import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { getUserCourseCompletions, createUserCourseCompletion } from "@/lib/db"

// 获取用户的课程完成记录
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const completions = await getUserCourseCompletions(session.user.id)

    return NextResponse.json({ completions }, { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching course completions:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to fetch course completions" },
      { status: 500 }
    )
  }
}

// 创建课程完成记录（通常由教练/管理员创建）
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 只有教练和管理员可以创建完成记录
    if (session.user.role !== 'coach' && session.user.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const {
      user_id,
      course_id,
      instance_id,
      completion_date,
      grade,
      certificate_url,
      notes,
    } = body

    if (!user_id || !course_id) {
      return NextResponse.json(
        { error: "Missing required fields: user_id, course_id" },
        { status: 400 }
      )
    }

    const completion = await createUserCourseCompletion(
      user_id,
      course_id,
      {
        instance_id,
        completion_date,
        grade,
        certificate_url,
        notes,
        verified_by: session.user.id,
      }
    )

    return NextResponse.json({ completion }, { status: 201 })
  } catch (error: unknown) {
    console.error("Error creating course completion:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to create course completion" },
      { status: 500 }
    )
  }
}

