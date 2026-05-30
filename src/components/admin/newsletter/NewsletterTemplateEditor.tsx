"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RichTextEditor } from "@/components/admin/RichTextEditor"
import {
  defaultNewsletterTemplateConfig,
  getTemplateEditorDefinition,
  type NewsletterTemplateConfig,
  type NewsletterTemplateEditorKind,
} from "@/lib/newsletter-template-editor"
import {
  BLAZE_NEWSLETTER_CONTACT,
  BLAZE_NEWSLETTER_WEBSITE,
} from "@/lib/newsletter-email-templates"
import { Lock, Link2, Mail } from "lucide-react"

export type NewsletterTemplateEditorValue = {
  config: NewsletterTemplateConfig
  bodyHtml: string
}

type NewsletterTemplateEditorProps = {
  templateName: string
  value: NewsletterTemplateEditorValue
  onChange: (value: NewsletterTemplateEditorValue) => void
  legacyFullHtml?: boolean
}

export function NewsletterTemplateEditor({
  templateName,
  value,
  onChange,
  legacyFullHtml = false,
}: NewsletterTemplateEditorProps) {
  const def = getTemplateEditorDefinition(templateName)
  const [previewHtml, setPreviewHtml] = useState<string>("")

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch("/api/admin/newsletter/templates/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: templateName,
            editor: value,
          }),
        })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && data.html) setPreviewHtml(data.html)
      } catch {
        /* ignore */
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [templateName, value])

  const patchConfig = (patch: Partial<NewsletterTemplateConfig>) => {
    onChange({
      ...value,
      config: { ...value.config, ...patch },
    })
  }

  return (
    <div className="space-y-4">
      {legacyFullHtml && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This template was saved as full HTML. Save once to migrate to the structured
          editor (recommended). Unsubscribe links will be locked to the system footer.
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Link settings
          </CardTitle>
          <p className="text-xs text-muted-foreground font-normal">
            Website and contact links use placeholders filled at send time. Edit labels
            in the CTA section below, not raw unsubscribe URLs.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website URL</Label>
            <Input
              id="websiteUrl"
              type="url"
              value={value.config.websiteUrl}
              onChange={(e) => patchConfig({ websiteUrl: e.target.value })}
              placeholder={BLAZE_NEWSLETTER_WEBSITE}
            />
            <p className="text-xs text-muted-foreground">
              Used for header link, &quot;View programs&quot;, and footer &quot;Visit
              website&quot; ({"{{website_url}}"}).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact email</Label>
            <Input
              id="contactEmail"
              type="email"
              value={value.config.contactEmail}
              onChange={(e) => patchConfig({ contactEmail: e.target.value })}
              placeholder={BLAZE_NEWSLETTER_CONTACT}
            />
            <p className="text-xs text-muted-foreground">
              Used for mailto links ({"{{contact_email}}"}).
            </p>
          </div>
          <CtaFields kind={def.kind} config={value.config} onPatch={patchConfig} />
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Label>Email body</Label>
        <RichTextEditor
          value={value.bodyHtml}
          onChange={(bodyHtml) => onChange({ ...value, bodyHtml })}
          placeholder="Write your message…"
          hint="Do not add Unsubscribe links here — they are added automatically in the footer."
          minHeight={220}
        />
        <p className="text-xs text-muted-foreground">
          In the body you may use {"{{website_url}}"} or {"{{contact_email}}"} in link
          URLs if needed. Never use {"{{unsubscribe_link}}"} in the editor.
        </p>
      </div>

      <SystemFooterPreview
        kind={def.kind}
        hasSystemUnsubscribe={def.hasSystemUnsubscribe}
      />

      {previewHtml ? (
        <div className="space-y-2">
          <Label>Send preview (placeholders resolved)</Label>
          <div
            className="border rounded-lg p-4 bg-white max-h-[280px] overflow-auto text-sm"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      ) : null}
    </div>
  )
}

function CtaFields({
  kind,
  config,
  onPatch,
}: {
  kind: NewsletterTemplateEditorKind
  config: NewsletterTemplateConfig
  onPatch: (p: Partial<NewsletterTemplateConfig>) => void
}) {
  if (kind === "latest_updates") {
    return (
      <div className="space-y-3 pt-2 border-t">
        <p className="text-xs font-medium text-muted-foreground">Registration CTA</p>
        <div className="space-y-2">
          <Label htmlFor="ctaTitle">CTA title</Label>
          <Input
            id="ctaTitle"
            value={config.ctaTitle ?? ""}
            onChange={(e) => onPatch({ ctaTitle: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ctaDescription">CTA description</Label>
          <Textarea
            id="ctaDescription"
            rows={2}
            value={config.ctaDescription ?? ""}
            onChange={(e) => onPatch({ ctaDescription: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ctaButtonLabel">Button label</Label>
          <Input
            id="ctaButtonLabel"
            value={config.ctaButtonLabel ?? ""}
            onChange={(e) => onPatch({ ctaButtonLabel: e.target.value })}
          />
        </div>
      </div>
    )
  }

  if (kind === "welcome_first" || kind === "welcome_resubscribe") {
    return (
      <div className="space-y-2 pt-2 border-t">
        <Label htmlFor="primaryButtonLabel">Primary button label</Label>
        <Input
          id="primaryButtonLabel"
          value={config.primaryButtonLabel ?? ""}
          onChange={(e) => onPatch({ primaryButtonLabel: e.target.value })}
        />
      </div>
    )
  }

  if (kind === "unsubscribe_confirm") {
    return (
      <div className="space-y-2 pt-2 border-t">
        <Label htmlFor="returnButtonLabel">Return button label</Label>
        <Input
          id="returnButtonLabel"
          value={config.returnButtonLabel ?? ""}
          onChange={(e) => onPatch({ returnButtonLabel: e.target.value })}
        />
      </div>
    )
  }

  return null
}

function SystemFooterPreview({
  kind,
  hasSystemUnsubscribe,
}: {
  kind: NewsletterTemplateEditorKind
  hasSystemUnsubscribe: boolean
}) {
  return (
    <Card className="bg-muted/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          System footer (not editable)
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-2">
        {hasSystemUnsubscribe ? (
          <p className="flex items-start gap-2">
            <Badge variant="secondary" className="shrink-0">
              Auto
            </Badge>
            <span>
              <strong>Unsubscribe</strong> — unique link per subscriber (
              {"{{unsubscribe_link}}"} → /newsletter/unsubscribe?token=…). Cannot be
              changed in the HTML editor.
            </span>
          </p>
        ) : (
          <p>No marketing unsubscribe (confirmation email only).</p>
        )}
        <p className="flex items-start gap-2">
          <Mail className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          Footer also includes Visit website and Contact us using your link settings
          above.
        </p>
        {kind === "unsubscribe_confirm" && (
          <p>Resubscribe link points to your configured website URL.</p>
        )}
      </CardContent>
    </Card>
  )
}

export function createEmptyEditorValue(): NewsletterTemplateEditorValue {
  return {
    config: defaultNewsletterTemplateConfig(),
    bodyHtml: "",
  }
}
