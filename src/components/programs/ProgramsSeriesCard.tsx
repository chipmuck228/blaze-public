"use client"

import { useState } from "react"
import { RichTextDisplay, hasRichContent } from "@/components/RichTextDisplay"
import type { ProgramsCatalogSeries } from "@/lib/programs-catalog-tree"
import { collectOfferingTypeCodesForSeries } from "@/lib/programs-catalog-tree"
import { ProgramsOfferingRow } from "@/components/programs/ProgramsOfferingRow"
import { OfferingTypeIconGroup } from "@/components/programs/SessionCatalogMetaIcons"
import { normalizeRemoteImageUrl } from "@/lib/normalize-image-url"
import styles from "@/app/programs/programs.module.css"
import { cn } from "@/lib/utils"

interface ProgramsSeriesCardProps {
  series: ProgramsCatalogSeries
}

export function ProgramsSeriesCard({ series }: ProgramsSeriesCardProps) {
  const [open, setOpen] = useState(false)
  const offeringCount = series.offerings.length
  const offeringTypeCodes = collectOfferingTypeCodesForSeries(series)
  const posterSrc = normalizeRemoteImageUrl(series.poster_url)

  return (
    <article className={cn(styles.seriesCard, open && styles.seriesCardOpen)}>
      <button
        type="button"
        className={cn(
          styles.seriesHeader,
          posterSrc ? styles.seriesHeaderWithPoster : styles.seriesHeaderFallback
        )}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {posterSrc ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={posterSrc} alt="" className={styles.seriesPosterBg} />
            <div className={styles.seriesHeaderOverlay} aria-hidden />
          </>
        ) : null}

        <div className={styles.seriesHeaderContent}>
          <div>
            <div className={styles.seriesTags}>
              <span className={styles.seriesTag}>
                {offeringCount} Offering{offeringCount !== 1 ? "s" : ""}
              </span>
              {series.campuses.map((campus) => (
                <span
                  key={campus.code}
                  className={cn(styles.seriesTag, styles.seriesTagCampus)}
                >
                  {campus.name}
                </span>
              ))}
              {series.featured ? <span className={styles.seriesTag}>Featured</span> : null}
              {offeringTypeCodes.length > 0 ? (
                <span className={styles.seriesTagTypeIcons}>
                  <OfferingTypeIconGroup codes={offeringTypeCodes} />
                </span>
              ) : null}
            </div>
            <div className={styles.seriesTitleRow}>
              <div>
                <div className={styles.seriesTitle}>{series.display_name}</div>
              </div>
            </div>
          </div>
          <span className={styles.seriesArrow} aria-hidden>
            ▾
          </span>
        </div>
      </button>

      {hasRichContent(series.description) ? (
        <div className={styles.seriesDescBlock}>
          <RichTextDisplay content={series.description!} className={styles.seriesDesc} />
        </div>
      ) : null}

      <div className={styles.seriesContent}>
        <div className={styles.seriesContentInner}>
          <div className={styles.offeringList}>
            <div className={styles.offeringListLabel}>Available Offerings</div>
            {series.offerings.map((offering) => (
              <ProgramsOfferingRow key={offering.id} offering={offering} />
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}
