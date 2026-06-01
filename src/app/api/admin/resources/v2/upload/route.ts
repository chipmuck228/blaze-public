import { NextRequest, NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/typed-error"
import { auth } from "@/auth"
import { put, del } from "@vercel/blob"

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.ms-excel", // .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
]
const MAX_SIZE = 20 * 1024 * 1024 // 20MB

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

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PDF, DOC, DOCX, XLS, XLSX." },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 20MB limit." },
        { status: 400 }
      )
    }

    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 9)
    const ext = file.name.split(".").pop() || "pdf"
    const fileName = `resource-documents/${timestamp}-${randomString}.${ext}`

    const blob = await put(fileName, file, {
      access: "public",
      contentType: file.type,
    })

    return NextResponse.json(
      { url: blob.url, pathname: blob.pathname },
      { status: 200 }
    )
  } catch (error: unknown) {
    console.error("Error uploading resource document:", error)
    return NextResponse.json(
      { error: error instanceof Error ? getErrorMessage(error) : "Failed to upload" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const url = searchParams.get("url")
    if (!url) {
      return NextResponse.json({ error: "Missing parameter: url" }, { status: 400 })
    }

    await del(url)
    return NextResponse.json({ message: "Deleted successfully" }, { status: 200 })
  } catch (error: unknown) {
    console.error("Error deleting resource document:", error)
    const msg = error instanceof Error ? getErrorMessage(error) : ""
    if (msg.includes("not found") || msg.includes("404")) {
      return NextResponse.json({ message: "Already deleted or not found" }, { status: 200 })
    }
    return NextResponse.json(
      { error: msg || "Failed to delete" },
      { status: 500 }
    )
  }
}
