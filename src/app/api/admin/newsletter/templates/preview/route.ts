import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prepareNewsletterHtmlForSend } from "@/lib/newsletter-template-runtime"
import { resolveTemplateContentHtml } from "@/lib/newsletter-template-save"

/** POST — render template with send-time placeholders (admin preview). */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    let contentHtml: string
    try {
      contentHtml = resolveTemplateContentHtml({
        name: body?.name || "Custom Template",
        subject: body?.subject || "Preview",
        content_html: body?.content_html,
        editor: body?.editor,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid preview payload"
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const html = prepareNewsletterHtmlForSend(contentHtml, {
      testUnsubscribeToken: "preview",
    })

    return NextResponse.json({ html }, { status: 200 })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to render preview"
    console.error("[newsletter/templates/preview]", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
