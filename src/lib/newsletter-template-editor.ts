import {
  BLAZE_NEWSLETTER_CONTACT,
  BLAZE_NEWSLETTER_WEBSITE,
  buildNewsletterEmailLayout,
  LATEST_UPDATES_BODY_PLACEHOLDER,
  marketingFooterHtml,
  NEWSLETTER_TEMPLATE_NAMES,
  resubscribeFooterHtml,
  UNSUBSCRIBE_CONFIRM_DEFAULT_BODY,
  unsubscribeFooterHtml,
  WELCOME_FIRST_DEFAULT_BODY,
  WELCOME_RESUBSCRIBE_DEFAULT_BODY,
  type NewsletterTemplateName,
} from "@/lib/newsletter-email-templates"

/** Embedded in stored HTML; parsed at save/send. Not shown in admin preview as raw JSON. */
export const NEWSLETTER_CONFIG_MARKER = "BLAZE_NEWSLETTER_CONFIG"
const CONFIG_REGEX = new RegExp(
  `<!--${NEWSLETTER_CONFIG_MARKER}:([\\s\\S]*?)-->`,
  "i"
)
export const EDITABLE_BODY_START = "<!--BLAZE_EDITABLE_BODY_START-->"
export const EDITABLE_BODY_END = "<!--BLAZE_EDITABLE_BODY_END-->"

export type NewsletterTemplateConfig = {
  websiteUrl: string
  contactEmail: string
  /** Latest Updates CTA block */
  ctaEnabled?: boolean
  ctaTitle?: string
  ctaDescription?: string
  ctaButtonLabel?: string
  /** Welcome / resubscribe primary button */
  primaryButtonLabel?: string
  /** Unsubscribe confirmation button */
  returnButtonLabel?: string
}

export type NewsletterTemplateEditorKind =
  | "latest_updates"
  | "welcome_first"
  | "welcome_resubscribe"
  | "unsubscribe_confirm"
  | "custom"

export type NewsletterTemplateEditorDefinition = {
  kind: NewsletterTemplateEditorKind
  /** System injects {{unsubscribe_link}} in footer — not editable in body */
  hasSystemUnsubscribe: boolean
  /** Only the inner region is edited in Rich Text */
  usesBodySlot: boolean
  preheader: string
}

export type ParsedNewsletterTemplate = {
  kind: NewsletterTemplateEditorKind
  config: NewsletterTemplateConfig
  bodyHtml: string
  /** True when stored HTML could not be split — show advanced warning */
  legacyFullHtml: boolean
}

export const defaultNewsletterTemplateConfig = (): NewsletterTemplateConfig => ({
  websiteUrl: BLAZE_NEWSLETTER_WEBSITE,
  contactEmail: BLAZE_NEWSLETTER_CONTACT,
  ctaEnabled: true,
  ctaTitle: "Ready to register?",
  ctaDescription:
    "Browse camps, courses, and programs on our official site.",
  ctaButtonLabel: "View programs",
  primaryButtonLabel: "Explore programs",
  returnButtonLabel: "Return to BlazeRoboticsAcademy.org",
})

export function getTemplateEditorDefinition(
  templateName: string
): NewsletterTemplateEditorDefinition {
  switch (templateName) {
    case NEWSLETTER_TEMPLATE_NAMES.LATEST_UPDATES:
      return {
        kind: "latest_updates",
        hasSystemUnsubscribe: true,
        usesBodySlot: true,
        preheader: "Programs, events, and news from Blaze Robotics Academy.",
      }
    case NEWSLETTER_TEMPLATE_NAMES.WELCOME_FIRST:
      return {
        kind: "welcome_first",
        hasSystemUnsubscribe: true,
        usesBodySlot: false,
        preheader: "You're subscribed — programs, camps, and academy news ahead.",
      }
    case NEWSLETTER_TEMPLATE_NAMES.WELCOME_RESUBSCRIBE:
      return {
        kind: "welcome_resubscribe",
        hasSystemUnsubscribe: true,
        usesBodySlot: false,
        preheader: "Your newsletter subscription is active again.",
      }
    case NEWSLETTER_TEMPLATE_NAMES.UNSUBSCRIBE_CONFIRMATION:
      return {
        kind: "unsubscribe_confirm",
        hasSystemUnsubscribe: false,
        usesBodySlot: false,
        preheader: "Your newsletter unsubscribe request is confirmed.",
      }
    default:
      return {
        kind: "custom",
        hasSystemUnsubscribe: true,
        usesBodySlot: true,
        preheader: "",
      }
  }
}

export function extractConfigFromHtml(html: string): {
  htmlWithoutConfig: string
  config: NewsletterTemplateConfig | null
} {
  const match = html.match(CONFIG_REGEX)
  if (!match?.[1]) {
    return { htmlWithoutConfig: html, config: null }
  }
  try {
    const parsed = JSON.parse(match[1].trim()) as Partial<NewsletterTemplateConfig>
    return {
      htmlWithoutConfig: html.replace(CONFIG_REGEX, "").trim(),
      config: {
        ...defaultNewsletterTemplateConfig(),
        ...parsed,
        websiteUrl: parsed.websiteUrl || BLAZE_NEWSLETTER_WEBSITE,
        contactEmail: parsed.contactEmail || BLAZE_NEWSLETTER_CONTACT,
      },
    }
  } catch {
    return { htmlWithoutConfig: html.replace(CONFIG_REGEX, "").trim(), config: null }
  }
}

export function encodeConfigComment(config: NewsletterTemplateConfig): string {
  return `<!--${NEWSLETTER_CONFIG_MARKER}:${JSON.stringify(config)}-->`
}

/** Remove system-only placeholders from editable body (admin must not set unsubscribe). */
export function sanitizeEditableBodyHtml(html: string): string {
  let out = html
  out = out.replace(/\{\{\s*unsubscribe_link\s*\}\}/gi, "")
  out = out.replace(/\/newsletter\/unsubscribe\?token=[a-zA-Z0-9]+/gi, "")
  out = out.replace(
    /<a[^>]*href=["'][^"']*unsubscribe[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,
    ""
  )
  return out.trim()
}

function extractBetweenMarkers(html: string): string | null {
  const start = html.indexOf(EDITABLE_BODY_START)
  const end = html.indexOf(EDITABLE_BODY_END)
  if (start === -1 || end === -1 || end <= start) return null
  return html.slice(start + EDITABLE_BODY_START.length, end).trim()
}

function extractBodyContentSlot(html: string): string | null {
  const match = html.match(
    /<div[^>]*>\s*(\{\{body_content\}\}|<!--BLAZE_EDITABLE_BODY_START-->[\s\S]*?<!--BLAZE_EDITABLE_BODY_END-->)\s*<\/div>/i
  )
  if (!match) return null
  const inner = match[1]
  if (inner.includes(EDITABLE_BODY_START)) {
    return extractBetweenMarkers(inner) ?? inner
  }
  if (inner.includes("{{body_content}}")) {
    return null
  }
  return inner
}

/** Parse DB HTML into admin editor fields. */
export function parseTemplateForEditor(
  contentHtml: string,
  templateName: string
): ParsedNewsletterTemplate {
  const def = getTemplateEditorDefinition(templateName)
  const { htmlWithoutConfig, config: embeddedConfig } =
    extractConfigFromHtml(contentHtml)
  const config = embeddedConfig ?? defaultNewsletterTemplateConfig()

  const marked = extractBetweenMarkers(htmlWithoutConfig)
  if (marked) {
    return {
      kind: def.kind,
      config,
      bodyHtml: marked,
      legacyFullHtml: false,
    }
  }

  if (def.usesBodySlot) {
    const slot = extractBodyContentSlot(htmlWithoutConfig)
    if (slot) {
      return { kind: def.kind, config, bodyHtml: slot, legacyFullHtml: false }
    }
    if (htmlWithoutConfig.includes("{{body_content}}")) {
      return {
        kind: def.kind,
        config,
        bodyHtml: LATEST_UPDATES_BODY_PLACEHOLDER,
        legacyFullHtml: false,
      }
    }
  }

  if (def.kind === "custom") {
    return {
      kind: def.kind,
      config,
      bodyHtml: htmlWithoutConfig,
      legacyFullHtml: true,
    }
  }

  const defaultBody = getDefaultBodyForKind(def.kind)
  return {
    kind: def.kind,
    config,
    bodyHtml: defaultBody,
    legacyFullHtml: true,
  }
}

function getDefaultBodyForKind(kind: NewsletterTemplateEditorKind): string {
  switch (kind) {
    case "latest_updates":
      return LATEST_UPDATES_BODY_PLACEHOLDER
    case "welcome_first":
      return WELCOME_FIRST_DEFAULT_BODY
    case "welcome_resubscribe":
      return WELCOME_RESUBSCRIBE_DEFAULT_BODY
    case "unsubscribe_confirm":
      return UNSUBSCRIBE_CONFIRM_DEFAULT_BODY
    default:
      return "<p style=\"margin:0;\">Newsletter content</p>"
  }
}

function wrapEditableBody(innerHtml: string): string {
  return `${EDITABLE_BODY_START}${innerHtml}${EDITABLE_BODY_END}`
}

function buildLatestUpdatesBody(
  config: NewsletterTemplateConfig,
  bodyHtml: string
): string {
  const ctaBlock =
    config.ctaEnabled !== false
      ? `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;margin-bottom:24px;">
          <tr>
            <td style="padding:20px;text-align:center;">
              <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#1e3a8a;">${escapeHtml(config.ctaTitle || "Ready to register?")}</p>
              <p style="margin:0 0 16px;font-size:14px;color:#475569;">${escapeHtml(config.ctaDescription || "")}</p>
              <a href="{{website_url}}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;background-color:#2563eb;border-radius:8px;">${escapeHtml(config.ctaButtonLabel || "View programs")}</a>
            </td>
          </tr>
        </table>`
      : ""

  return `
        <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#0d9488;text-transform:uppercase;letter-spacing:0.08em;">Newsletter</p>
        <h2 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#0f172a;">Latest updates</h2>
        <div style="margin-bottom:24px;">
          ${wrapEditableBody(bodyHtml)}
        </div>
        ${ctaBlock}
        <p style="margin:0;font-size:14px;color:#64748b;">Thank you for being part of our community.</p>
      `
}

function buildWelcomeFirstBody(
  config: NewsletterTemplateConfig,
  bodyHtml: string
): string {
  return `
        ${wrapEditableBody(bodyHtml)}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;">
          <tr>
            <td style="border-radius:8px;background-color:#2563eb;">
              <a href="{{website_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(config.primaryButtonLabel || "Explore programs")}</a>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0;font-size:14px;color:#64748b;">Questions? Email us at <a href="mailto:{{contact_email}}" style="color:#2563eb;">{{contact_email}}</a>.</p>
      `
}

function buildWelcomeResubscribeBody(
  config: NewsletterTemplateConfig,
  bodyHtml: string
): string {
  return `
        ${wrapEditableBody(bodyHtml)}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:20px;">
          <tr>
            <td style="border-radius:8px;background-color:#0d9488;">
              <a href="{{website_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(config.primaryButtonLabel || "View latest programs")}</a>
            </td>
          </tr>
        </table>
      `
}

function buildUnsubscribeConfirmBody(
  config: NewsletterTemplateConfig,
  bodyHtml: string
): string {
  return `
        ${wrapEditableBody(bodyHtml)}
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:20px;">
          <tr>
            <td style="border-radius:8px;background-color:#0f172a;">
              <a href="{{website_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(config.returnButtonLabel || "Return to BlazeRoboticsAcademy.org")}</a>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0;font-size:14px;color:#64748b;">Need help? Contact <a href="mailto:{{contact_email}}" style="color:#2563eb;">{{contact_email}}</a>.</p>
      `
}

function buildCustomBody(bodyHtml: string): string {
  return `
        <div style="margin-bottom:24px;">
          ${wrapEditableBody(bodyHtml)}
        </div>
      `
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function resolveFooterHtml(kind: NewsletterTemplateEditorKind): string {
  switch (kind) {
    case "welcome_resubscribe":
      return resubscribeFooterHtml()
    case "unsubscribe_confirm":
      return unsubscribeFooterHtml()
    default:
      return marketingFooterHtml()
  }
}

/** Build full stored HTML from admin editor fields. */
export function assembleTemplateHtml(
  templateName: string,
  config: NewsletterTemplateConfig,
  bodyHtml: string
): string {
  const def = getTemplateEditorDefinition(templateName)
  const cleanBody = sanitizeEditableBodyHtml(bodyHtml)

  let innerBody: string
  switch (def.kind) {
    case "latest_updates":
      innerBody = buildLatestUpdatesBody(config, cleanBody)
      break
    case "welcome_first":
      innerBody = buildWelcomeFirstBody(config, cleanBody)
      break
    case "welcome_resubscribe":
      innerBody = buildWelcomeResubscribeBody(config, cleanBody)
      break
    case "unsubscribe_confirm":
      innerBody = buildUnsubscribeConfirmBody(config, cleanBody)
      break
    default:
      innerBody = buildCustomBody(cleanBody)
  }

  const layout = buildNewsletterEmailLayout({
    preheader: def.preheader,
    bodyHtml: innerBody,
    footerHtml: resolveFooterHtml(def.kind),
  })

  return `${encodeConfigComment(config)}\n${layout}`
}

export function getConfigForSend(
  contentHtml: string
): NewsletterTemplateConfig {
  const { config } = extractConfigFromHtml(contentHtml)
  return config ?? defaultNewsletterTemplateConfig()
}

export function isKnownSeededTemplateName(name: string): name is NewsletterTemplateName {
  return Object.values(NEWSLETTER_TEMPLATE_NAMES).includes(
    name as NewsletterTemplateName
  )
}
