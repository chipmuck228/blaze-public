import {
  assembleTemplateHtml,
  parseTemplateForEditor,
  type NewsletterTemplateConfig,
} from "@/lib/newsletter-template-editor"

export type NewsletterTemplateSaveInput = {
  name: string
  subject: string
  content_text?: string | null
  is_active?: boolean
  /** Legacy: full HTML (custom templates only) */
  content_html?: string
  /** Structured editor payload (preferred) */
  editor?: {
    config: NewsletterTemplateConfig
    bodyHtml: string
  }
}

export function resolveTemplateContentHtml(
  input: NewsletterTemplateSaveInput
): string {
  if (input.editor) {
    return assembleTemplateHtml(
      input.name,
      input.editor.config,
      input.editor.bodyHtml
    )
  }

  if (input.content_html) {
    return input.content_html
  }

  throw new Error("Template body is required")
}

export function parseTemplateRowForApi(
  name: string,
  contentHtml: string
) {
  const parsed = parseTemplateForEditor(contentHtml, name)
  return {
    editor: {
      kind: parsed.kind,
      config: parsed.config,
      bodyHtml: parsed.bodyHtml,
      legacyFullHtml: parsed.legacyFullHtml,
    },
    content_html: contentHtml,
  }
}
