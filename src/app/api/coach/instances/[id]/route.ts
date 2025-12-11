import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getCoachInstanceById } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user || session.user.role !== "coach") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const instance = await getCoachInstanceById(session.user.id, id)

    if (!instance) {
      return NextResponse.json(
        { error: "Instance not found or access denied" },
        { status: 404 }
      )
    }

    return NextResponse.json(instance)
  } catch (error: any) {
    console.error("Error fetching coach instance:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch coach instance" },
      { status: 500 }
    )
  }
}

