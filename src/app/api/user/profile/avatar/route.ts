import { NextRequest, NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { updateUser } from "@/lib/db"
import { put } from "@vercel/blob"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE = 2 * 1024 * 1024 // 2MB

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP." },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 2MB limit." },
        { status: 400 }
      )
    }

    const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp"
    const fileName = `user-avatars/${session.user.id}/${Date.now()}.${ext}`

    const blob = await put(fileName, file, {
      access: "public",
      contentType: file.type,
    })

    await updateUser(session.user.id, { image: blob.url })

    return NextResponse.json({ url: blob.url, image: blob.url }, { status: 200 })
  } catch (error: unknown) {
    console.error("Error uploading avatar:", error)
    return NextResponse.json(
      { error: error instanceof Error ? getErrorMessage(error) : "Failed to upload avatar" },
      { status: 500 }
    )
  }
}
