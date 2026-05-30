import { supabaseAdmin } from "@/lib/supabase"
import { sendNewsletterEmail } from "@/lib/email"
import {
  BLAZE_NEWSLETTER_CONTACT,
  BLAZE_NEWSLETTER_WEBSITE,
  defaultNewsletterTemplates,
  LATEST_UPDATES_BODY_PLACEHOLDER,
  NEWSLETTER_TEMPLATE_NAMES,
  type DefaultNewsletterTemplate,
  type NewsletterTemplateName,
} from "@/lib/newsletter-email-templates"
import { getConfigForSend } from "@/lib/newsletter-template-editor"

/** Templates that must include a per-subscriber tokenized unsubscribe URL when sent */
export const TEMPLATES_REQUIRING_UNSUBSCRIBE_TOKEN: ReadonlySet<NewsletterTemplateName> =
  new Set([
    NEWSLETTER_TEMPLATE_NAMES.WELCOME_FIRST,
    NEWSLETTER_TEMPLATE_NAMES.WELCOME_RESUBSCRIBE,
    NEWSLETTER_TEMPLATE_NAMES.LATEST_UPDATES,
  ])

export function getNewsletterBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return "http://localhost:3000"
}

/** System-generated unsubscribe URL: {appOrigin}/newsletter/unsubscribe?token={subscriber.unsubscribe_token} */
export function buildUnsubscribeLink(baseUrl: string, token: string): string {
  return `${baseUrl}/newsletter/unsubscribe?token=${encodeURIComponent(token)}`
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Replaces {{key}} placeholders (and common editor/encoding variants) at send time.
 */
export function renderNewsletterTemplate(
  html: string,
  variables: Record<string, string>
): string {
  let output = html
  for (const [key, value] of Object.entries(variables)) {
    if (!value) continue
    const escapedKey = escapeRegExp(key)
    const patterns = [
      `\\{\\{\\s*${escapedKey}\\s*\\}\\}`,
      `&#123;&#123;\\s*${escapedKey}\\s*&#125;&#125;`,
      `%7B%7B${escapedKey}%7D%7D`,
    ]
    for (const pattern of patterns) {
      output = output.replace(new RegExp(pattern, "gi"), value)
    }
  }
  return output
}

/**
 * Appends a footer unsubscribe block when the HTML does not already contain a tokenized link.
 * Used after {{unsubscribe_link}} replacement so campaigns stay compliant if templates are edited.
 */
export function appendUnsubscribeLink(
  htmlContent: string,
  unsubscribeLink: string
): string {
  const hasUnsubscribeLink =
    htmlContent.includes(unsubscribeLink) ||
    htmlContent.includes("/newsletter/unsubscribe?token=")

  if (hasUnsubscribeLink) {
    return htmlContent
  }

  const unsubscribeFooter = `
    <div style="margin-top: 40px; padding: 20px; border-top: 1px solid #e0e0e0; text-align: center; font-size: 12px; color: #666;">
      <p style="margin: 0 0 10px 0;">
        You are receiving this email because you subscribed to our newsletter.
      </p>
      <p style="margin: 0;">
        <a href="${unsubscribeLink}" style="color: #666; text-decoration: underline;">
          Unsubscribe from this list
        </a>
      </p>
    </div>
  `

  if (htmlContent.includes("</body>")) {
    return htmlContent.replace("</body>", `${unsubscribeFooter}</body>`)
  }
  return htmlContent + unsubscribeFooter
}

export type PrepareNewsletterHtmlOptions = {
  /** From newsletter_subscribers.unsubscribe_token — unique per recipient */
  unsubscribeToken?: string
  /** Admin test sends only (e.g. token=test) */
  testUnsubscribeToken?: string
  baseUrl?: string
  extraVariables?: Record<string, string>
}

/**
 * Replaces template placeholders and ensures a valid tokenized unsubscribe URL is present.
 * {{unsubscribe_link}} is never stored in DB as a final URL; it is filled at send time.
 */
export function prepareNewsletterHtmlForSend(
  contentHtml: string,
  options: PrepareNewsletterHtmlOptions = {}
): string {
  const baseUrl = options.baseUrl ?? getNewsletterBaseUrl()
  const token = options.unsubscribeToken ?? options.testUnsubscribeToken
  const templateConfig = getConfigForSend(contentHtml)

  const variables: Record<string, string> = {
    ...options.extraVariables,
    website_url: templateConfig.websiteUrl || BLAZE_NEWSLETTER_WEBSITE,
    contact_email: templateConfig.contactEmail || BLAZE_NEWSLETTER_CONTACT,
    body_content:
      options.extraVariables?.body_content ?? LATEST_UPDATES_BODY_PLACEHOLDER,
  }

  if (token) {
    variables.unsubscribe_link = buildUnsubscribeLink(baseUrl, token)
  }

  let html = renderNewsletterTemplate(contentHtml, variables)

  if (token && variables.unsubscribe_link) {
    html = appendUnsubscribeLink(html, variables.unsubscribe_link)
  }

  return html
}

export function getDefaultTemplateByName(
  name: NewsletterTemplateName
): DefaultNewsletterTemplate | undefined {
  return defaultNewsletterTemplates.find((t) => t.name === name)
}

export async function fetchNewsletterTemplateByName(name: NewsletterTemplateName) {
  const { data, error } = await supabaseAdmin
    .from("newsletter_templates")
    .select("id, name, subject, content_html, content_text, is_active")
    .eq("name", name)
    .maybeSingle()

  if (error) {
    console.error(`[newsletter-template] fetch failed for "${name}":`, error)
    return null
  }

  return data
}

type SendTransactionalOptions = {
  templateName: NewsletterTemplateName
  to: string
  unsubscribeToken?: string
  extraVariables?: Record<string, string>
}

/**
 * Sends a transactional newsletter email using DB template, falling back to lib defaults.
 */
export async function sendNewsletterTransactionalEmail({
  templateName,
  to,
  unsubscribeToken,
  extraVariables = {},
}: SendTransactionalOptions): Promise<void> {
  if (
    TEMPLATES_REQUIRING_UNSUBSCRIBE_TOKEN.has(templateName) &&
    !unsubscribeToken
  ) {
    throw new Error(
      `Template "${templateName}" requires unsubscribeToken from newsletter_subscribers`
    )
  }

  const dbTemplate = await fetchNewsletterTemplateByName(templateName)
  const fallback = getDefaultTemplateByName(templateName)

  const subject = dbTemplate?.subject ?? fallback?.subject
  const contentHtml = dbTemplate?.content_html ?? fallback?.content_html

  if (!subject || !contentHtml) {
    throw new Error(`Newsletter template not found: ${templateName}`)
  }

  const html = prepareNewsletterHtmlForSend(contentHtml, {
    unsubscribeToken,
    extraVariables,
  })

  await sendNewsletterEmail(to, subject, html)
}
