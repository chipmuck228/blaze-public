import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { isStudentAccount } from "@/lib/permissions"

/** GET /api/students/me — whether the current user is a linked student account */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const is_student = await isStudentAccount(session.user.id)
    return NextResponse.json({ is_student })
  } catch (error: unknown) {
    console.error("Error checking student account:", error)
    return NextResponse.json(
      { error: error instanceof Error ? getErrorMessage(error) : "Failed to check student account" },
      { status: 500 }
    )
  }
}
