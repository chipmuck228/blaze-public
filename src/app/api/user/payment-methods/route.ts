import { NextResponse } from "next/server"
import { auth } from "@/auth"

// 暂时返回空数组，等后续实现支付功能
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // TODO: 实现支付功能后，从数据库获取用户的支付方式
    // 目前返回空数组
    return NextResponse.json([])
  } catch (error: any) {
    console.error("Error fetching payment methods:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch payment methods" },
      { status: 500 }
    )
  }
}

