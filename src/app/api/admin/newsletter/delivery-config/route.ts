import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { getNewsletterDeliveryConfig } from "@/lib/newsletter-admin-delivery"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json(getNewsletterDeliveryConfig(), { status: 200 })
  } catch (error: unknown) {
    const message = error instanceof Error ? getErrorMessage(error) : "Failed to load config"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
