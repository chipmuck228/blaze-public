import { NextRequest, NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { put, del } from "@vercel/blob"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // 验证文件类型
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 }
      )
    }

    // 验证文件大小（最大 5MB）
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit." },
        { status: 400 }
      )
    }

    // 生成唯一文件名
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 9)
    const fileExtension = file.name.split(".").pop()
    const fileName = `offering-posters/${timestamp}-${randomString}.${fileExtension}`

    // 上传到 Vercel Blob
    const blob = await put(fileName, file, {
      access: "public",
      contentType: file.type,
    })

    return NextResponse.json(
      {
        url: blob.url,
        pathname: blob.pathname,
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error uploading offering poster:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to upload poster" },
      { status: 500 }
    )
  }
}

// 删除 offering poster（用于回退）
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")

    if (!url) {
      return NextResponse.json(
        { error: "Missing required parameter: url" },
        { status: 400 }
      )
    }

    // 删除 blob 文件
    await del(url)

    return NextResponse.json(
      { message: "Poster deleted successfully" },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error deleting offering poster:", error)
    // 如果文件不存在，也返回成功（幂等性）
    if (getErrorMessage(error)?.includes("not found") || getErrorMessage(error)?.includes("404")) {
      return NextResponse.json(
        { message: "Poster already deleted or not found" },
        { status: 200 }
      )
    }
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to delete poster" },
      { status: 500 }
    )
  }
}
