import { NextRequest, NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { put, del } from "@vercel/blob"

// 上传 franchise poster
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

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 }
      )
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit." },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 9)
    const fileExtension = file.name.split(".").pop()
    const fileName = `franchise-posters/${timestamp}-${randomString}.${fileExtension}`

    const blob = await put(fileName, file, {
      access: "public",
      contentType: file.type,
    })

    return NextResponse.json(
      { url: blob.url, pathname: blob.pathname },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error uploading franchise poster:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) || "Failed to upload poster" },
      { status: 500 }
    )
  }
}

// 删除 franchise poster（用于回退）
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

    await del(url)

    return NextResponse.json(
      { message: "Poster deleted successfully" },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error deleting franchise poster:", error)
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
