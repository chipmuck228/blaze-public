import { NextResponse } from "next/server"
import { newsletterInformationClause } from "@/lib/newsletter-information-clause"

export async function GET() {
  try {
    return NextResponse.json(newsletterInformationClause, { status: 200 })
  } catch (error: unknown) {
    console.error("Error fetching information clause:", error)
    return NextResponse.json(
      { error: "Failed to fetch information clause" },
      { status: 500 }
    )
  }
}
