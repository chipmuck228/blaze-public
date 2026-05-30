export const BLAZE_WEBSITE_URL = "https://www.blazeroboticsacademy.org/"
export const BLAZE_WEBSITE_LABEL = "BlazeRoboticsAcademy.org"
export const BLAZE_CONTACT_EMAIL = "info@blazeroboticsacademy.org"
export const BLAZE_CONTROLLER_NAME = "Blaze Robotics Academy"

export type NewsletterInformationClauseSection = {
  id: string
  title: string
  paragraphs?: string[]
  bullets?: string[]
  highlight?: boolean
}

export type NewsletterInformationClause = {
  title: string
  subtitle: string
  lastUpdated: string
  sections: NewsletterInformationClauseSection[]
}

export const newsletterInformationClause: NewsletterInformationClause = {
  title: "Information Clause",
  subtitle:
    "Privacy notice for newsletter subscription and related communications",
  lastUpdated: "May 30, 2026",
  sections: [
    {
      id: "scope",
      title: "Scope",
      paragraphs: [
        "This Information Clause explains how Blaze Robotics Academy processes personal data when you subscribe to our newsletter or otherwise provide your email address for marketing and informational communications through BlazeRoboticsAcademy.org and related channels.",
        "By checking the consent box and submitting your email, you acknowledge that you have read and understood this notice.",
      ],
    },
    {
      id: "controller",
      title: "Data Controller",
      highlight: true,
      paragraphs: [
        `${BLAZE_CONTROLLER_NAME} is the data controller responsible for your personal data in connection with newsletter subscription.`,
        `Official website: ${BLAZE_WEBSITE_LABEL}`,
      ],
    },
    {
      id: "data-collected",
      title: "Categories of Personal Data",
      paragraphs: [
        "We collect only the data necessary for newsletter subscription and delivery:",
      ],
      bullets: [
        "Email address (required for subscription)",
        "Subscription status and preferences (e.g., active, unsubscribed)",
        "Technical metadata related to delivery (e.g., send timestamps), where applicable",
      ],
    },
    {
      id: "purposes",
      title: "Purposes of Processing",
      bullets: [
        "To send newsletter updates about programs, camps, courses, events, and academy news",
        "To provide information about products, services, promotions, and educational content",
        "To respond to inquiries you submit in connection with our communications",
      ],
    },
    {
      id: "legal-basis",
      title: "Legal Basis",
      paragraphs: [
        "We process your email address and related subscription data based on your freely given, specific, informed, and unambiguous consent (Article 6(1)(a) of the EU General Data Protection Regulation (GDPR), where applicable).",
        "You may withdraw your consent at any time without affecting the lawfulness of processing based on consent before its withdrawal.",
      ],
    },
    {
      id: "recipients",
      title: "Recipients and Processors",
      paragraphs: [
        "Your personal data is processed by Blaze Robotics Academy and may be shared with trusted service providers who assist with email delivery, hosting, and technical operations, solely on our instructions and subject to appropriate confidentiality and data protection safeguards.",
        "We do not sell your personal data to third parties.",
      ],
    },
    {
      id: "retention",
      title: "Data Retention",
      paragraphs: [
        "We retain your email address and subscription records for as long as you remain subscribed to the newsletter, and for a limited period thereafter where necessary to honor unsubscribe requests, resolve disputes, or comply with legal obligations.",
        "You may unsubscribe at any time using the unsubscribe link included in each newsletter email. Upon unsubscribe, we will stop sending marketing communications and update your subscription status accordingly.",
      ],
    },
    {
      id: "rights",
      title: "Your Rights",
      paragraphs: [
        "Depending on applicable law, you may have the following rights regarding your personal data:",
      ],
      bullets: [
        "Right of access — to obtain confirmation and a copy of your data",
        "Right to rectification — to correct inaccurate or incomplete data",
        "Right to erasure — to request deletion where legally applicable",
        "Right to restriction of processing — in certain circumstances",
        "Right to data portability — to receive data you provided in a structured format",
        "Right to object — to processing based on legitimate interests, where applicable",
        "Right to withdraw consent — at any time, without penalty",
      ],
    },
    {
      id: "contact",
      title: "Contact and Exercising Your Rights",
      highlight: true,
      paragraphs: [
        `To exercise your rights, ask questions about this notice, or request assistance with your subscription, contact us at ${BLAZE_CONTACT_EMAIL}.`,
        "We will respond to verified requests within the timeframe required by applicable data protection law.",
      ],
    },
    {
      id: "complaints",
      title: "Complaints",
      paragraphs: [
        "If you believe that the processing of your personal data infringes applicable data protection laws, you have the right to lodge a complaint with a competent supervisory authority in your country of habitual residence, place of work, or place of the alleged infringement.",
      ],
    },
  ],
}
