/**
 * Default newsletter email templates (seeded into newsletter_templates).
 * Placeholders (filled at send time by the system — do not hardcode URLs in admin):
 * - {{unsubscribe_link}} → per-subscriber URL from newsletter_subscribers.unsubscribe_token
 * - {{website_url}}, {{contact_email}}, {{body_content}}
 */

export const NEWSLETTER_TEMPLATE_NAMES = {
  WELCOME_FIRST: "Welcome — First Subscription",
  WELCOME_RESUBSCRIBE: "Welcome — Resubscribe",
  UNSUBSCRIBE_CONFIRMATION: "Unsubscribe Confirmation",
  LATEST_UPDATES: "Latest Updates — Newsletter",
} as const

export type NewsletterTemplateName =
  (typeof NEWSLETTER_TEMPLATE_NAMES)[keyof typeof NEWSLETTER_TEMPLATE_NAMES]

/** Seeded templates used by subscribe flow and default campaigns — avoid hard delete / careless deactivate. */
export const SEEDED_NEWSLETTER_TEMPLATE_NAMES: ReadonlySet<string> = new Set(
  Object.values(NEWSLETTER_TEMPLATE_NAMES)
)

export function isSeededNewsletterTemplateName(name: string): boolean {
  return SEEDED_NEWSLETTER_TEMPLATE_NAMES.has(name)
}

export const BLAZE_NEWSLETTER_WEBSITE = "https://www.blazeroboticsacademy.org/"
export const BLAZE_NEWSLETTER_CONTACT = "info@blazeroboticsacademy.org"
export const BLAZE_NEWSLETTER_BRAND = "Blaze Robotics Academy"

type EmailLayoutOptions = {
  preheader: string
  bodyHtml: string
  footerHtml: string
}

/** Table-based HTML shell for broad email client support */
export function buildNewsletterEmailLayout({
  preheader,
  bodyHtml,
  footerHtml,
}: EmailLayoutOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${BLAZE_NEWSLETTER_BRAND}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1e40af 55%,#0d9488 100%);padding:28px 32px;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.75);">Blaze Robotics Academy</p>
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">${BLAZE_NEWSLETTER_BRAND}</h1>
              <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">
                <a href="{{website_url}}" style="color:#99f6e4;text-decoration:none;">BlazeRoboticsAcademy.org</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#334155;font-size:15px;line-height:1.65;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;">
              ${footerHtml}
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;text-align:center;">
          &copy; ${new Date().getFullYear()} ${BLAZE_NEWSLETTER_BRAND}. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/** System footer — {{unsubscribe_link}} is filled per subscriber at send time; do not edit in admin body. */
export function marketingFooterHtml(): string {
  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #e2e8f0;">
  <tr>
    <td style="padding-top:20px;text-align:center;font-size:12px;color:#64748b;line-height:1.6;">
      <p style="margin:0 0 10px;">You are receiving this email because you subscribed to our newsletter.</p>
      <p style="margin:0;">
        <a href="{{unsubscribe_link}}" style="color:#2563eb;text-decoration:underline;">Unsubscribe</a>
        &nbsp;&middot;&nbsp;
        <a href="{{website_url}}" style="color:#2563eb;text-decoration:underline;">Visit website</a>
        &nbsp;&middot;&nbsp;
        <a href="mailto:{{contact_email}}" style="color:#2563eb;text-decoration:underline;">Contact us</a>
      </p>
    </td>
  </tr>
</table>`
}

export function resubscribeFooterHtml(): string {
  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #e2e8f0;">
  <tr>
    <td style="padding-top:20px;text-align:center;font-size:12px;color:#64748b;line-height:1.6;">
      <p style="margin:0 0 10px;">You are receiving this email because you resubscribed to our newsletter.</p>
      <p style="margin:0;">
        <a href="{{unsubscribe_link}}" style="color:#2563eb;text-decoration:underline;">Unsubscribe</a>
        &nbsp;&middot;&nbsp;
        <a href="{{website_url}}" style="color:#2563eb;text-decoration:underline;">Visit website</a>
      </p>
    </td>
  </tr>
</table>`
}

export function unsubscribeFooterHtml(): string {
  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #e2e8f0;">
  <tr>
    <td style="padding-top:20px;text-align:center;font-size:12px;color:#64748b;line-height:1.6;">
      <p style="margin:0 0 10px;">This confirms your request to stop newsletter emails.</p>
      <p style="margin:0;">
        <a href="{{website_url}}" style="color:#2563eb;text-decoration:underline;">Resubscribe on our website</a>
        &nbsp;&middot;&nbsp;
        <a href="mailto:{{contact_email}}" style="color:#2563eb;text-decoration:underline;">Contact us</a>
      </p>
    </td>
  </tr>
</table>`
}

const marketingFooter = marketingFooterHtml()
const resubscribeFooter = resubscribeFooterHtml()
const unsubscribeFooter = unsubscribeFooterHtml()

export type DefaultNewsletterTemplate = {
  name: NewsletterTemplateName
  subject: string
  content_html: string
  content_text: string
  is_active: boolean
}

export const defaultNewsletterTemplates: DefaultNewsletterTemplate[] = [
  {
    name: NEWSLETTER_TEMPLATE_NAMES.WELCOME_FIRST,
    subject: "Welcome to Blaze Robotics Academy",
    is_active: true,
    content_html: buildNewsletterEmailLayout({
      preheader: "You're subscribed — programs, camps, and academy news ahead.",
      bodyHtml: `
        <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0f172a;">Welcome aboard!</h2>
        <p style="margin:0 0 16px;">Thank you for subscribing to the <strong>${BLAZE_NEWSLETTER_BRAND}</strong> newsletter. We're glad to have you with us.</p>
        <p style="margin:0 0 20px;">You'll receive curated updates about robotics programs, summer camps, courses, competitions, and special announcements for families in the Seattle area and beyond.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:20px;">
          <tr>
            <td style="padding:20px;">
              <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#0f172a;text-transform:uppercase;letter-spacing:0.05em;">What you'll receive</p>
              <ul style="margin:0;padding-left:20px;color:#475569;">
                <li style="margin-bottom:8px;">New program and camp schedules</li>
                <li style="margin-bottom:8px;">Registration openings and reminders</li>
                <li style="margin-bottom:8px;">Competition and community highlights</li>
                <li style="margin-bottom:0;">Tips and resources for young robotics learners</li>
              </ul>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 24px;">We respect your inbox and send only relevant, valuable content.</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="border-radius:8px;background-color:#2563eb;">
              <a href="{{website_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Explore programs</a>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0;font-size:14px;color:#64748b;">Questions? Email us at <a href="mailto:{{contact_email}}" style="color:#2563eb;">{{contact_email}}</a>.</p>
      `,
      footerHtml: marketingFooter,
    }),
    content_text: `Welcome to ${BLAZE_NEWSLETTER_BRAND}!

Thank you for subscribing. You'll receive updates about programs, camps, courses, and academy news.

Explore programs: {{website_url}}
Contact: {{contact_email}}

Unsubscribe: {{unsubscribe_link}}`,
  },
  {
    name: NEWSLETTER_TEMPLATE_NAMES.WELCOME_RESUBSCRIBE,
    subject: "Welcome back to Blaze Robotics Academy",
    is_active: true,
    content_html: buildNewsletterEmailLayout({
      preheader: "Your newsletter subscription is active again.",
      bodyHtml: `
        <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0f172a;">Welcome back!</h2>
        <p style="margin:0 0 16px;">Your subscription to the <strong>${BLAZE_NEWSLETTER_BRAND}</strong> newsletter has been reactivated.</p>
        <p style="margin:0 0 20px;">You'll once again receive updates on programs, camps, events, and news from <a href="{{website_url}}" style="color:#2563eb;">BlazeRoboticsAcademy.org</a>.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;margin-bottom:20px;">
          <tr>
            <td style="padding:18px;">
              <p style="margin:0;font-size:14px;color:#065f46;"><strong>You're all set.</strong> No further action is needed — watch your inbox for the next update.</p>
            </td>
          </tr>
        </table>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="border-radius:8px;background-color:#0d9488;">
              <a href="{{website_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">View latest programs</a>
            </td>
          </tr>
        </table>
      `,
      footerHtml: resubscribeFooter,
    }),
    content_text: `Welcome back to ${BLAZE_NEWSLETTER_BRAND}!

Your newsletter subscription is active again.

Visit: {{website_url}}
Unsubscribe: {{unsubscribe_link}}`,
  },
  {
    name: NEWSLETTER_TEMPLATE_NAMES.UNSUBSCRIBE_CONFIRMATION,
    subject: "You've been unsubscribed — Blaze Robotics Academy",
    is_active: true,
    content_html: buildNewsletterEmailLayout({
      preheader: "Your newsletter unsubscribe request is confirmed.",
      bodyHtml: `
        <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0f172a;">Unsubscribe confirmed</h2>
        <p style="margin:0 0 16px;">We've processed your request. You will no longer receive marketing newsletter emails from <strong>${BLAZE_NEWSLETTER_BRAND}</strong>.</p>
        <p style="margin:0 0 20px;">If you unsubscribed by mistake, you can subscribe again anytime on our website.</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="border-radius:8px;background-color:#0f172a;">
              <a href="{{website_url}}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Return to BlazeRoboticsAcademy.org</a>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0;font-size:14px;color:#64748b;">Need help? Contact <a href="mailto:{{contact_email}}" style="color:#2563eb;">{{contact_email}}</a>.</p>
      `,
      footerHtml: unsubscribeFooter,
    }),
    content_text: `You have been unsubscribed from the ${BLAZE_NEWSLETTER_BRAND} newsletter.

Resubscribe: {{website_url}}
Contact: {{contact_email}}`,
  },
  {
    name: NEWSLETTER_TEMPLATE_NAMES.LATEST_UPDATES,
    subject: "Latest from Blaze Robotics Academy",
    is_active: true,
    content_html: buildNewsletterEmailLayout({
      preheader: "Programs, events, and news from Blaze Robotics Academy.",
      bodyHtml: `
        <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#0d9488;text-transform:uppercase;letter-spacing:0.08em;">Newsletter</p>
        <h2 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#0f172a;">Latest updates</h2>
        <div style="margin-bottom:24px;">
          {{body_content}}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;margin-bottom:24px;">
          <tr>
            <td style="padding:20px;text-align:center;">
              <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#1e3a8a;">Ready to register?</p>
              <p style="margin:0 0 16px;font-size:14px;color:#475569;">Browse camps, courses, and programs on our official site.</p>
              <a href="{{website_url}}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;background-color:#2563eb;border-radius:8px;">View programs</a>
            </td>
          </tr>
        </table>
        <p style="margin:0;font-size:14px;color:#64748b;">Thank you for being part of our community.</p>
      `,
      footerHtml: marketingFooter,
    }),
    content_text: `Latest updates from ${BLAZE_NEWSLETTER_BRAND}

{{body_content}}

View programs: {{website_url}}
Unsubscribe: {{unsubscribe_link}}`,
  },
]

/** Default HTML block for Latest Updates when sending campaigns (replace in admin editor) */
export const LATEST_UPDATES_BODY_PLACEHOLDER = `<p style="margin:0 0 16px;"><strong>[Edit this section before sending]</strong> Share your headline, program highlights, dates, and registration details here.</p>
<p style="margin:0;">Example: Summer camp registration is now open for Bellevue and surrounding locations. Spaces are limited — register early to secure your student's spot.</p>`

/** Default editable regions for structured admin editor (seed / first open). */
export const WELCOME_FIRST_DEFAULT_BODY = `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0f172a;">Welcome aboard!</h2>
<p style="margin:0 0 16px;">Thank you for subscribing to the <strong>Blaze Robotics Academy</strong> newsletter. We're glad to have you with us.</p>
<p style="margin:0 0 20px;">You'll receive curated updates about robotics programs, summer camps, courses, competitions, and special announcements for families in the Seattle area and beyond.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:20px;">
  <tr>
    <td style="padding:20px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#0f172a;text-transform:uppercase;letter-spacing:0.05em;">What you'll receive</p>
      <ul style="margin:0;padding-left:20px;color:#475569;">
        <li style="margin-bottom:8px;">New program and camp schedules</li>
        <li style="margin-bottom:8px;">Registration openings and reminders</li>
        <li style="margin-bottom:8px;">Competition and community highlights</li>
        <li style="margin-bottom:0;">Tips and resources for young robotics learners</li>
      </ul>
    </td>
  </tr>
</table>
<p style="margin:0 0 24px;">We respect your inbox and send only relevant, valuable content.</p>`

export const WELCOME_RESUBSCRIBE_DEFAULT_BODY = `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0f172a;">Welcome back!</h2>
<p style="margin:0 0 16px;">Your subscription to the <strong>Blaze Robotics Academy</strong> newsletter has been reactivated.</p>
<p style="margin:0 0 20px;">You'll once again receive updates on programs, camps, events, and news from <a href="{{website_url}}" style="color:#2563eb;">BlazeRoboticsAcademy.org</a>.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;margin-bottom:20px;">
  <tr>
    <td style="padding:18px;">
      <p style="margin:0;font-size:14px;color:#065f46;"><strong>You're all set.</strong> No further action is needed — watch your inbox for the next update.</p>
    </td>
  </tr>
</table>`

export const UNSUBSCRIBE_CONFIRM_DEFAULT_BODY = `<h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0f172a;">Unsubscribe confirmed</h2>
<p style="margin:0 0 16px;">We've processed your request. You will no longer receive marketing newsletter emails from <strong>Blaze Robotics Academy</strong>.</p>
<p style="margin:0 0 20px;">If you unsubscribed by mistake, you can subscribe again anytime on our website.</p>`
