import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { put } from "@vercel/blob"

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
    const fileName = `category-posters/${timestamp}-${randomString}.${fileExtension}`

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
  } catch (error: any) {
    console.error("Error uploading category poster:", error)
    return NextResponse.json(
      { error: error.message || "Failed to upload poster" },
      { status: 500 }
    )
  }
}
