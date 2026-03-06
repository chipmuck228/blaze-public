'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, ExternalLink } from "lucide-react"

export type CtaItem = { text?: string; link?: string; style?: string }
export type CtaConfig = { primary?: CtaItem; secondary?: CtaItem }
export type SloganConfig = { main?: string; subtitle?: string; tagline?: string }

interface LocationCtaProps {
  cta: CtaConfig
  slogan?: SloganConfig | null
}

function isExternal(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://")
}

function CtaButton({ item, variant }: { item: CtaItem; variant: "default" | "outline" }) {
  const text = item.text?.trim() || "Learn more"
  const link = item.link?.trim()
  if (!link) {
    return (
      <Button variant={variant} size="lg" className="rounded-full px-8 font-bold text-lg" asChild>
        <span>{text}</span>
      </Button>
    )
  }
  const external = isExternal(link)
  const className = "rounded-full px-8 font-bold text-lg flex items-center gap-2"
  if (external) {
    return (
      <Button variant={variant} size="lg" className={className} asChild>
        <a href={link} target="_blank" rel="noopener noreferrer">
          {text}
          <ExternalLink className="w-5 h-5" />
        </a>
      </Button>
    )
  }
  return (
    <Button variant={variant} size="lg" className={className} asChild>
      <Link href={link}>
        {text}
        <ArrowRight className="w-5 h-5" />
      </Link>
    </Button>
  )
}

export function LocationCta({ cta, slogan }: LocationCtaProps) {
  const primary = cta?.primary
  const secondary = cta?.secondary
  const hasPrimary = primary?.text || primary?.link
  const hasSecondary = secondary?.text || secondary?.link
  const title = slogan?.main?.trim() || slogan?.tagline?.trim()
  const subtitle = slogan?.subtitle?.trim()

  return (
    <section id="cta" className="bg-muted/50 py-16 sm:py-20">
      <div className="container mx-auto px-4 lg:grid lg:grid-cols-2 place-items-center gap-8">
        <div className="lg:col-start-1 text-center lg:text-left">
          {title && (
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-muted-foreground text-xl mt-4 mb-8 lg:mb-0">
              {subtitle}
            </p>
          )}
          {!title && !subtitle && (
            <p className="text-muted-foreground text-xl mb-8 lg:mb-0">
              Ready to get started? Choose an option below.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-4 justify-center lg:justify-start lg:col-start-2">
          {hasPrimary && (
            <CtaButton
              item={primary}
              variant={primary?.style === "outline" ? "outline" : "default"}
            />
          )}
          {hasSecondary && (
            <CtaButton
              item={secondary!}
              variant={secondary?.style === "default" ? "default" : "outline"}
            />
          )}
        </div>
      </div>
    </section>
  )
}
