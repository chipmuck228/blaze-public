'use client'

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExternalLink, Info, Loader2 } from "lucide-react"
import type { NewsletterDeliveryConfig } from "@/lib/newsletter-admin-delivery"

type NewsletterDeliveryPanelProps = {
  variant?: "default" | "compact"
  /** Extra context shown below the status grid */
  footnote?: string
}

export function NewsletterDeliveryPanel({
  variant = "default",
  footnote,
}: NewsletterDeliveryPanelProps) {
  const [config, setConfig] = useState<NewsletterDeliveryConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/admin/newsletter/delivery-config")
        if (response.ok) {
          setConfig(await response.json())
        }
      } catch (error) {
        console.error("[NewsletterDeliveryPanel] load failed:", error)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="flex items-center gap-2 py-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading delivery settings…
        </CardContent>
      </Card>
    )
  }

  if (!config) return null

  const providerBadge =
    config.provider === "resend" ? (
      <Badge variant="default">Resend</Badge>
    ) : (
      <Badge variant="secondary">SMTP fallback</Badge>
    )

  const bulkBadge =
    config.bulkSendMode === "broadcast" ? (
      <Badge variant="default">Broadcast</Badge>
    ) : (
      <Badge variant="outline">Per-recipient</Badge>
    )

  const items = [
    { label: "Provider", value: providerBadge },
    { label: "Bulk send", value: bulkBadge },
    {
      label: "Webhooks",
      value: (
        <Badge variant={config.webhookConfigured ? "default" : "destructive"}>
          {config.webhookConfigured ? "Configured" : "Not set"}
        </Badge>
      ),
    },
    {
      label: "Segment",
      value: (
        <Badge variant={config.segmentConfigured ? "default" : "outline"}>
          {config.segmentConfigured ? "Linked" : "Optional"}
        </Badge>
      ),
    },
  ]

  if (variant === "compact") {
    return (
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
        <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-muted-foreground">Delivery:</span>
        {providerBadge}
        {bulkBadge}
        {config.resendConfigured && (
          <a
            href={config.resendDashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            Resend dashboard
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {footnote && <span className="w-full text-xs text-muted-foreground">{footnote}</span>}
      </div>
    )
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Email delivery (Resend)</CardTitle>
        <CardDescription>
          Blaze owns subscribers and templates; Resend handles sending and delivery events.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className="space-y-1">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <div>{item.value}</div>
            </div>
          ))}
        </div>
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          {config.bulkSendMode === "broadcast" ? (
            <li>
              Bulk campaigns use Resend Broadcast to your segment; unsubscribe uses{" "}
              <code className="rounded bg-muted px-1">{"{{{RESEND_UNSUBSCRIBE_URL}}}"}</code>.
            </li>
          ) : (
            <li>
              Set <code className="rounded bg-muted px-1">RESEND_NEWSLETTER_SEGMENT_ID</code> to
              enable Broadcast; otherwise each subscriber is emailed individually.
            </li>
          )}
          <li>
            Welcome and transactional emails always use Blaze token links (
            <code className="rounded bg-muted px-1">/newsletter/unsubscribe?token=…</code>).
          </li>
          {config.webhookConfigured ? (
            <li>Bounces and Resend unsubscribes update this admin via webhook.</li>
          ) : (
            <li>
              Configure <code className="rounded bg-muted px-1">RESEND_WEBHOOK_SECRET</code> and
              endpoint <code className="rounded bg-muted px-1">/api/webhooks/resend</code> for
              bounce tracking.
            </li>
          )}
        </ul>
        {config.resendConfigured && (
          <a
            href={config.resendDashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Open Resend dashboard
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {footnote && <p className="text-xs text-muted-foreground border-t pt-3">{footnote}</p>}
      </CardContent>
    </Card>
  )
}

export function CampaignDeliveryBadge({
  resendBroadcastId,
}: {
  resendBroadcastId?: string | null
}) {
  if (resendBroadcastId) {
    return <Badge variant="default">Broadcast</Badge>
  }
  return <Badge variant="outline">Per-recipient</Badge>
}
