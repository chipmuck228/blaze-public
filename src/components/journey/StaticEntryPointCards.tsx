"use client"

import Link from "next/link"
import type { StaticEntryCard } from "@/lib/stage-journey-config"
import styles from "@/app/journey/stage-journey.module.css"

const TONE_CLASS: Record<StaticEntryCard["tone"], string> = {
  blue: styles.e1,
  gold: styles.e2,
  green: styles.e3,
}

interface StaticEntryPointCardsProps {
  cards: StaticEntryCard[]
  condensedFont?: string
}

function CardInner({ card, condensedFont }: { card: StaticEntryCard; condensedFont?: string }) {
  return (
    <>
      <div className={`${styles.ect} ${TONE_CLASS[card.tone]}`}>
        <div className={styles.ecIco}>{card.icon}</div>
        <div className={styles.ecTitle} style={condensedFont ? { fontFamily: condensedFont } : undefined}>
          {card.title}
        </div>
        <div className={styles.ecSub} style={condensedFont ? { fontFamily: condensedFont } : undefined}>
          {card.subtitle}
        </div>
      </div>
      <div className={styles.ecb}>
        <ul>
          {card.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
        <div className={styles.ecLink} style={condensedFont ? { fontFamily: condensedFont } : undefined}>
          {card.linkLabel}
        </div>
      </div>
    </>
  )
}

export function StaticEntryPointCards({ cards, condensedFont }: StaticEntryPointCardsProps) {
  return (
    <div className={styles.egrid}>
      {cards.map((card) => {
        const className = styles.ec
        if (card.external || card.href.startsWith("http")) {
          return (
            <a
              key={card.title}
              href={card.href}
              className={className}
              target="_blank"
              rel="noopener noreferrer"
            >
              <CardInner card={card} condensedFont={condensedFont} />
            </a>
          )
        }
        if (card.href.startsWith("#")) {
          return (
            <a key={card.title} href={card.href} className={className}>
              <CardInner card={card} condensedFont={condensedFont} />
            </a>
          )
        }
        return (
          <Link key={card.title} href={card.href} className={className}>
            <CardInner card={card} condensedFont={condensedFont} />
          </Link>
        )
      })}
    </div>
  )
}
