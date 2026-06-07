"use client"

import type { ProgramsCatalogStats } from "@/lib/programs-catalog-tree"
import styles from "@/app/programs/programs.module.css"

interface ProgramsCatalogHeroProps {
  campusName: string | null
  stats: ProgramsCatalogStats
}

export function ProgramsCatalogHero({ campusName, stats }: ProgramsCatalogHeroProps) {
  const kickerParts = [
    `${stats.stages} Program${stats.stages !== 1 ? "s" : ""}`,
    `${stats.series} Series`,
    `${stats.offerings} Offering${stats.offerings !== 1 ? "s" : ""}`,
  ]

  return (
    <section className={styles.hero}>
      <div className={styles.heroOrbs} aria-hidden>
        <div className={styles.heroOrbPrimary} />
        <div className={styles.heroOrbSecondary} />
      </div>
      <div className={styles.heroInner}>
        <p className={styles.kicker}>{kickerParts.join(" · ")}</p>
        <h1 className={styles.heroTitle}>
          {campusName ? (
            <>
              Browse Programs
              <br />
              <span className={styles.heroTitleAccent}>@{campusName}</span>
            </>
          ) : (
            <>
              Browse
              <br />
              <span className={styles.heroTitleAccent}>All Programs.</span>
            </>
          )}
        </h1>
        <p className={styles.heroSub}>
          Every offering at Blaze — organized by program track, then by series. Expand a series to
          see individual offerings. Each session links directly to its Amilia enrollment page.
        </p>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{stats.stages}</div>
            <div className={styles.statLabel}>Programs</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{stats.series}</div>
            <div className={styles.statLabel}>Series</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{stats.offerings}</div>
            <div className={styles.statLabel}>Offerings</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{stats.locations || "—"}</div>
            <div className={styles.statLabel}>Locations</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>K–12</div>
            <div className={styles.statLabel}>All Grades</div>
          </div>
        </div>
      </div>
    </section>
  )
}
