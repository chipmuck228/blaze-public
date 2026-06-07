"use client"

import { useLayoutEffect, useState } from "react"
import {
  isBrowserDOMPurifyAvailable,
  RICH_TEXT_SANITIZE_OPTIONS,
  sanitizeRichHtml,
} from "@/lib/sanitize-html"
import type { Config } from "dompurify"

export function useSanitizedHtml(html: string, enabled: boolean, options: Config = RICH_TEXT_SANITIZE_OPTIONS) {
  const [sanitized, setSanitized] = useState<string | null>(() => {
    if (!enabled || !isBrowserDOMPurifyAvailable()) return null
    return sanitizeRichHtml(html, options)
  })

  useLayoutEffect(() => {
    if (!enabled) {
      setSanitized(null)
      return
    }
    setSanitized(sanitizeRichHtml(html, options))
  }, [enabled, html, options])

  return sanitized
}
