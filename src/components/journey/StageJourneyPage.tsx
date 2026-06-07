"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { Barlow, Barlow_Condensed } from "next/font/google"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { StageEntryPointSection } from "@/components/journey/StageEntryPointSection"
import {
  StageJourneyCtaSection,
  StageJourneyMembershipSection,
  StageJourneyVexSection,
} from "@/components/journey/StageJourneySharedSections"
import type { StageJourneyConfig, StageJourneySlug } from "@/lib/stage-journey-config"
import { getStageJourneyConfig } from "@/lib/stage-journey-config"
import styles from "@/app/journey/stage-journey.module.css"

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
})

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-barlow-condensed",
})

const CONDENSED = "var(--font-barlow-condensed), sans-serif"

type QuickFitId = "trial" | "member" | "course" | "compete"

const IGNITE_QUICK_FIT: Array<{
  id: QuickFitId
  title: string
  desc: string
  recTitle: string
  recBody: string
  ctaHref: string
  ctaLabel: string
}> = [
  {
    id: "trial",
    title: "✨ Total Beginner",
    desc: "Never touched a robot. Just curious — want to see if they'd enjoy it.",
    recTitle: "Free Trial Class",
    recBody:
      "One hands-on session with a Blaze coach. Zero commitment — just come and see. If they love it, we'll find the perfect next step together.",
    ctaHref: "https://app.amilia.com/store/en/blazeroboticsacademy/shop/programs",
    ctaLabel: "Book a Free Trial",
  },
  {
    id: "member",
    title: "🔧 Interested But Unsure",
    desc: "Likes building and tech but hasn't tried robotics specifically.",
    recTitle: "Club Membership",
    recBody:
      "Afterschool Mon–Fri with open build time, guided lessons, and coaching. Flexible — come as often as you like.",
    ctaHref: "#membership",
    ctaLabel: "See Membership Plans",
  },
  {
    id: "course",
    title: "📘 Ready to Learn",
    desc: "Motivated and ready for structured weekly lessons — competition optional.",
    recTitle: "Blaze Courses",
    recBody:
      "RoboQuests (K–3), LaunchPad, or RoboChamps (3–11) — structured weekly sessions building real engineering and design thinking skills.",
    ctaHref: "/programs",
    ctaLabel: "Browse Courses",
  },
  {
    id: "compete",
    title: "🏆 Wants to Compete",
    desc: "Has experience and wants to join a competition team and circuit.",
    recTitle: "Competition Prep → Teams",
    recBody:
      "Start with our Competition Prep course — the required gateway to our elementary competition teams.",
    ctaHref: "/journey/compete",
    ctaLabel: "Learn About Teams",
  },
]

function IgniteQuickFitSection() {
  const [quickFit, setQuickFit] = useState<QuickFitId | null>(null)
  const selected = IGNITE_QUICK_FIT.find((o) => o.id === quickFit)

  return (
    <section className={`${styles.sec} ${styles.bgOff}`}>
      <div className={styles.lbl} style={{ fontFamily: CONDENSED }}>
        Quick Fit Finder
      </div>
      <h2 className={styles.h2} style={{ fontFamily: CONDENSED }}>
        Where Is Your
        <br />
        Child Right Now?
      </h2>
      <div className={styles.qbox}>
        <div className={styles.qh} style={{ fontFamily: CONDENSED }}>
          Tell Us Where to Start
        </div>
        <div className={styles.qs}>Pick the option that best describes your child — we&apos;ll point you to the right first step.</div>
        <div className={styles.qopts}>
          {IGNITE_QUICK_FIT.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`${styles.qo} ${quickFit === opt.id ? styles.qoSel : ""}`}
              onClick={() => setQuickFit(opt.id)}
            >
              <div className={styles.qoh} style={{ fontFamily: CONDENSED }}>
                {opt.title}
              </div>
              <div className={styles.qod}>{opt.desc}</div>
            </button>
          ))}
        </div>
        {selected && (
          <div className={`${styles.qr} ${styles.qrShow}`}>
            <div className={styles.qrl} style={{ fontFamily: CONDENSED }}>
              We Recommend
            </div>
            <div className={styles.qrh} style={{ fontFamily: CONDENSED }}>
              {selected.recTitle}
            </div>
            <div className={styles.qrb}>{selected.recBody}</div>
            {selected.ctaHref.startsWith("http") ? (
              <a href={selected.ctaHref} className={`${styles.btn} ${styles.btnBlue}`} target="_blank" rel="noopener noreferrer">
                {selected.ctaLabel}
              </a>
            ) : (
              <Link href={selected.ctaHref} className={`${styles.btn} ${styles.btnBlue}`}>
                {selected.ctaLabel}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function StageJourneyHero({ config }: { config: StageJourneyConfig }) {
  const { hero } = config
  return (
    <section className={styles.hero}>
      <div className={styles.heroInner}>
        <div className={styles.stepBadge}>⚡ {config.stepBadge}</div>
        <h1 className={styles.heroTitle} style={{ fontFamily: CONDENSED }}>
          {hero.titleBlocks.map((block) => (
            <span key={block.text}>
              {block.em ? (
                <em>{block.text}</em>
              ) : block.lined ? (
                <span className={styles.heroTitleLined}>{block.text}</span>
              ) : (
                block.text
              )}
              <br />
            </span>
          ))}
        </h1>
        <p className={styles.heroSub}>{hero.subtitle}</p>
        <div className={styles.heroActs}>
          {hero.primaryCta.external ? (
            <a
              href={hero.primaryCta.href}
              className={`${styles.btn} ${styles.btnRed} ${styles.btnLg}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {hero.primaryCta.label}
            </a>
          ) : (
            <Link href={hero.primaryCta.href} className={`${styles.btn} ${styles.btnRed} ${styles.btnLg}`}>
              {hero.primaryCta.label}
            </Link>
          )}
          {hero.secondaryCta ? (
            <Link href={hero.secondaryCta.href} className={`${styles.btn} ${styles.btnOutW} ${styles.btnLg}`}>
              {hero.secondaryCta.label}
            </Link>
          ) : null}
        </div>
        <div className={styles.heroNote}>
          <div className={styles.heroNoteTxt}>💡 {hero.note}</div>
        </div>
      </div>
    </section>
  )
}

function StageJourneyPageInner({ config }: { config: StageJourneyConfig }) {
  return (
    <>
      <StageJourneyHero config={config} />
      {config.slug === "ignite" ? <IgniteQuickFitSection /> : null}
      <StageEntryPointSection config={config} condensedFont={CONDENSED} />
      <StageJourneyMembershipSection condensedFont={CONDENSED} />
      <StageJourneyVexSection condensedFont={CONDENSED} />
      <StageJourneyCtaSection condensedFont={CONDENSED} />
    </>
  )
}

export function StageJourneyPage({ slug }: { slug: StageJourneySlug }) {
  const config = getStageJourneyConfig(slug)

  return (
    <>
      <Navbar />
      <div
        className={`${styles.page} ${barlow.variable} ${barlowCondensed.variable} pb-24 pt-14`}
        style={{ fontFamily: "var(--font-barlow), sans-serif" }}
      >
        <Suspense fallback={<div className={styles.seriesLoading}>Loading…</div>}>
          <StageJourneyPageInner config={config} />
        </Suspense>
      </div>
      <Footer />
    </>
  )
}
