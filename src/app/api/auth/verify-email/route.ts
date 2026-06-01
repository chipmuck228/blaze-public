import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { verifyEmail } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { error: "Missing verification token" },
        { status: 400 }
      )
    }

    const user = await verifyEmail(token)

    return NextResponse.json(
      { message: "Email verified successfully!", user: { id: user.id, name: user.name, email: user.email } },
      { status: 200 }
    )
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) || "Verification failed" },
      { status: 400 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: "Missing verification token" },
        { status: 400 }
      )
    }

    const user = await verifyEmail(token)

    return NextResponse.json(
      { message: "Email verified successfully!", user: { id: user.id, name: user.name, email: user.email } },
      { status: 200 }
    )
  } catch (error: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(error) || "Verification failed" },
      { status: 400 }
    )
  }
}

