#!/usr/bin/env npx tsx
/**
 * Seed default newsletter_templates rows (upsert by name).
 *
 * Usage:
 *   npx tsx scripts/seed-newsletter-templates.ts
 *   npm run seed:newsletter-templates
 */

import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import {
  defaultNewsletterTemplates,
  LATEST_UPDATES_BODY_PLACEHOLDER,
  NEWSLETTER_TEMPLATE_NAMES,
  UNSUBSCRIBE_CONFIRM_DEFAULT_BODY,
  WELCOME_FIRST_DEFAULT_BODY,
  WELCOME_RESUBSCRIBE_DEFAULT_BODY,
} from "../src/lib/newsletter-email-templates"
import {
  assembleTemplateHtml,
  defaultNewsletterTemplateConfig,
} from "../src/lib/newsletter-template-editor"

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local")
  if (!fs.existsSync(envPath)) return
  const envContent = fs.readFileSync(envPath, "utf8")
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (!match) return
    const key = match[1].trim()
    let value = match[2].trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  })
}

loadEnv()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function bodyForSeed(templateName: string): string {
  switch (templateName) {
    case NEWSLETTER_TEMPLATE_NAMES.LATEST_UPDATES:
      return LATEST_UPDATES_BODY_PLACEHOLDER
    case NEWSLETTER_TEMPLATE_NAMES.WELCOME_FIRST:
      return WELCOME_FIRST_DEFAULT_BODY
    case NEWSLETTER_TEMPLATE_NAMES.WELCOME_RESUBSCRIBE:
      return WELCOME_RESUBSCRIBE_DEFAULT_BODY
    case NEWSLETTER_TEMPLATE_NAMES.UNSUBSCRIBE_CONFIRMATION:
      return UNSUBSCRIBE_CONFIRM_DEFAULT_BODY
    default:
      return LATEST_UPDATES_BODY_PLACEHOLDER
  }
}

function prepareHtmlForSeed(templateName: string): string {
  return assembleTemplateHtml(
    templateName,
    defaultNewsletterTemplateConfig(),
    bodyForSeed(templateName)
  )
}

async function main() {
  console.log("Seeding newsletter_templates...")
  console.log("=".repeat(60))

  for (const template of defaultNewsletterTemplates) {
    const content_html = prepareHtmlForSeed(template.name)

    const { data: existing, error: findError } = await supabase
      .from("newsletter_templates")
      .select("id, name")
      .eq("name", template.name)
      .maybeSingle()

    if (findError) {
      console.error(`Failed to look up "${template.name}":`, findError.message)
      process.exit(1)
    }

    const payload = {
      name: template.name,
      subject: template.subject,
      content_html,
      content_text: template.content_text,
      is_active: template.is_active,
      updated_at: new Date().toISOString(),
    }

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("newsletter_templates")
        .update(payload)
        .eq("id", existing.id)

      if (updateError) {
        console.error(`Update failed for "${template.name}":`, updateError.message)
        process.exit(1)
      }
      console.log(`Updated: ${template.name} (${existing.id})`)
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from("newsletter_templates")
        .insert(payload)
        .select("id, name")
        .single()

      if (insertError) {
        console.error(`Insert failed for "${template.name}":`, insertError.message)
        process.exit(1)
      }
      console.log(`Created: ${template.name} (${inserted?.id})`)
    }
  }

  console.log("=".repeat(60))
  console.log(`Done. ${defaultNewsletterTemplates.length} templates ready in admin/newsletter/templates.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
