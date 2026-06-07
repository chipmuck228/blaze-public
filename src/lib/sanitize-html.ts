import type { Config } from "dompurify"

/** Shared allowlist for TipTap / admin WYSIWYG HTML. */
export const RICH_TEXT_SANITIZE_OPTIONS: Config = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "em",
    "s",
    "u",
    "a",
    "ul",
    "ol",
    "li",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "span",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "class", "style"],
}

type DOMPurifyLike = { sanitize: (dirty: string, config?: Config) => string }

function getBrowserDOMPurify(): DOMPurifyLike | null {
  if (typeof window === "undefined") return null
  // dompurify is browser-only; require lazily so SSR bundles do not invoke it at import time.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require("dompurify") as { default?: DOMPurifyLike } & DOMPurifyLike
  const purify = mod.default ?? mod
  return typeof purify.sanitize === "function" ? purify : null
}

/** Sanitize HTML for dangerouslySetInnerHTML. Returns empty string when DOMPurify is unavailable (SSR). */
export function sanitizeRichHtml(
  dirty: string,
  options: Config = RICH_TEXT_SANITIZE_OPTIONS
): string {
  const purify = getBrowserDOMPurify()
  if (!purify) return ""
  return purify.sanitize(dirty, options)
}

/** Strip HTML to plain text; safe on server and client. */
export function plainTextFromHtml(raw: string): string {
  const s = raw.trim()
  if (!s) return ""

  const purify = getBrowserDOMPurify()
  if (purify) {
    const div = document.createElement("div")
    div.innerHTML = purify.sanitize(s, RICH_TEXT_SANITIZE_OPTIONS)
    return (div.textContent || "").replace(/\s+/g, " ").trim()
  }

  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
}

export function isBrowserDOMPurifyAvailable(): boolean {
  return getBrowserDOMPurify() != null
}
