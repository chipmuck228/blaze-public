"use client"

import ReactMarkdown from "react-markdown"
import { cn } from "@/lib/utils"
import { plainTextFromHtml, RICH_TEXT_SANITIZE_OPTIONS } from "@/lib/sanitize-html"
import { useSanitizedHtml } from "@/hooks/use-sanitized-html"

const HTML_CONTENT_CLASS = cn(
  "text-sm leading-relaxed",
  "[&_p]:mb-1.5 [&_p:last-child]:mb-0",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ul]:space-y-0.5",
  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_ol]:space-y-0.5",
  "[&_li]:leading-snug",
  "[&_strong]:font-semibold [&_em]:italic",
  "[&_a]:underline"
)

/** Plain text for search/filter — strips HTML from WYSIWYG content. */
export function plainTextFromRichContent(raw: unknown): string {
  if (raw == null) return ""
  const s = typeof raw === "string" ? raw.trim() : String(raw).trim()
  if (!s) return ""
  const isHtml = s.startsWith("<") && s.includes(">")
  if (isHtml) return plainTextFromHtml(s)
  return s
}

export function hasRichContent(raw: unknown): boolean {
  return plainTextFromRichContent(raw).length > 0
}

interface RichTextDisplayProps {
  content: unknown
  className?: string
  /** Plain-text preview with line-clamp (safe for HTML lists in cards). */
  lineClamp?: 1 | 2 | 3
  /** When true, show formatted HTML (optional max-height when lineClamp set). */
  preserveFormatting?: boolean
}

/** Renders HTML (TipTap) or Markdown for read-only admin/C-end previews. */
export function RichTextDisplay({
  content,
  className,
  lineClamp,
  preserveFormatting = false,
}: RichTextDisplayProps) {
  const s = typeof content === "string" ? content.trim() : content == null ? "" : String(content).trim()
  const isHtml = s.startsWith("<") && s.includes(">")
  const hasContent = hasRichContent(s)
  const sanitizedHtml = useSanitizedHtml(s, isHtml && hasContent, RICH_TEXT_SANITIZE_OPTIONS)
  const lineClampClass =
    lineClamp === 1 ? "line-clamp-1" : lineClamp === 2 ? "line-clamp-2" : lineClamp === 3 ? "line-clamp-3" : undefined

  if (!hasContent) return null

  if (lineClamp && !preserveFormatting) {
    return (
      <p className={cn("text-sm", lineClampClass, className)}>
        {plainTextFromRichContent(s)}
      </p>
    )
  }

  if (isHtml) {
    if (!sanitizedHtml) {
      return (
        <p className={cn("text-sm", lineClampClass, className)}>
          {plainTextFromRichContent(s)}
        </p>
      )
    }

    return (
      <div
        className={cn(
          HTML_CONTENT_CLASS,
          lineClamp && preserveFormatting && "max-h-24 overflow-hidden",
          className
        )}
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    )
  }

  return (
    <div className={cn(HTML_CONTENT_CLASS, "prose prose-sm max-w-none", lineClampClass, className)}>
      <ReactMarkdown>{s}</ReactMarkdown>
    </div>
  )
}
