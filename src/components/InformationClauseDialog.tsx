'use client'

import Link from "next/link"
import { Building2, Mail, Shield } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { ScrollArea } from "./ui/scroll-area"
import { Separator } from "./ui/separator"
import {
  BLAZE_CONTACT_EMAIL,
  BLAZE_CONTROLLER_NAME,
  BLAZE_WEBSITE_LABEL,
  BLAZE_WEBSITE_URL,
  newsletterInformationClause,
  type NewsletterInformationClauseSection,
} from "@/lib/newsletter-information-clause"

interface InformationClauseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ClauseSection({ section }: { section: NewsletterInformationClauseSection }) {
  const isController = section.id === "controller"
  const isContact = section.id === "contact"
  const isRights = section.id === "rights"

  const wrapperClass = section.highlight
    ? "rounded-lg border border-border/80 bg-muted/40 p-4 space-y-3"
    : "space-y-3"

  return (
    <section aria-labelledby={`clause-${section.id}`} className={wrapperClass}>
      <h3
        id={`clause-${section.id}`}
        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {section.title}
      </h3>

      {isController && (
        <div className="flex items-start gap-3">
          <Building2 className="h-5 w-5 shrink-0 text-primary mt-0.5" aria-hidden />
          <div className="space-y-2 text-sm leading-relaxed text-foreground/90">
            <p>
              <span className="font-medium text-foreground">{BLAZE_CONTROLLER_NAME}</span>{" "}
              is the data controller responsible for your personal data in connection with
              newsletter subscription.
            </p>
            <p>
              Official website:{" "}
              <Link
                href={BLAZE_WEBSITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {BLAZE_WEBSITE_LABEL}
              </Link>
            </p>
          </div>
        </div>
      )}

      {isContact && (
        <div className="flex items-start gap-3">
          <Mail className="h-5 w-5 shrink-0 text-primary mt-0.5" aria-hidden />
          <div className="space-y-2 text-sm leading-relaxed text-foreground/90">
            <p>
              To exercise your rights, ask questions about this notice, or request assistance
              with your subscription, contact us at{" "}
              <a
                href={`mailto:${BLAZE_CONTACT_EMAIL}`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {BLAZE_CONTACT_EMAIL}
              </a>
              .
            </p>
            <p>
              We will respond to verified requests within the timeframe required by applicable
              data protection law.
            </p>
          </div>
        </div>
      )}

      {!isController && !isContact && (
        <>
          {section.paragraphs?.map((paragraph, index) => (
            <p key={index} className="text-sm leading-relaxed text-foreground/90">
              {paragraph}
            </p>
          ))}
          {section.bullets && (
            <ul
              className={
                isRights
                  ? "space-y-2.5"
                  : "list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground/90"
              }
            >
              {section.bullets.map((item, index) =>
                isRights ? (
                  <li key={index} className="flex items-start gap-3">
                    <Shield
                      className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5"
                      aria-hidden
                    />
                    <span className="text-sm leading-relaxed text-foreground/90">{item}</span>
                  </li>
                ) : (
                  <li key={index}>{item}</li>
                )
              )}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

export function InformationClauseDialog({
  open,
  onOpenChange,
}: InformationClauseDialogProps) {
  const { title, subtitle, lastUpdated, sections } = newsletterInformationClause

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col gap-0 overflow-hidden p-4 max-h-[min(90dvh,100%)] md:max-h-[85vh] md:max-w-3xl md:p-6"
      >
        <DialogHeader className="shrink-0 text-left space-y-1 pb-3">
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
          <p className="text-xs text-muted-foreground">Last updated: {lastUpdated}</p>
        </DialogHeader>

        <Separator className="shrink-0" />

        <ScrollArea className="mt-4 -mr-1 pr-3 flex-1 min-h-0 h-0">
          <div className="space-y-6 pb-2">
            {sections.map((section) => (
              <ClauseSection key={section.id} section={section} />
            ))}
          </div>
        </ScrollArea>

        <p className="shrink-0 pt-3 text-center text-xs text-muted-foreground">
          Tap or click outside to close
        </p>
      </DialogContent>
    </Dialog>
  )
}
