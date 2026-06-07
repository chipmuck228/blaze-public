"use client"

import { useState } from "react"
import type { ProgramsCatalogStage } from "@/lib/programs-catalog-tree"
import {
  countUniqueOfferingNamesInStage,
  collectOfferingTypeCodesForStage,
  stageAccentClass,
  stageJumpIcon,
} from "@/lib/programs-catalog-tree"
import { ProgramsSeriesCard } from "@/components/programs/ProgramsSeriesCard"
import { OfferingTypeIconGroup } from "@/components/programs/SessionCatalogMetaIcons"
import { normalizeRemoteImageUrl } from "@/lib/normalize-image-url"
import styles from "@/app/programs/programs.module.css"
import { cn } from "@/lib/utils"

interface ProgramsStageSectionProps {
  stage: ProgramsCatalogStage
  index: number
  defaultOpen?: boolean
}

export function ProgramsStageSection({
  stage,
  index,
  defaultOpen = false,
}: ProgramsStageSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const accent = stageAccentClass(index)
  const seriesCount = stage.series.length
  const offeringCount = countUniqueOfferingNamesInStage(stage)
  const offeringTypeCodes = collectOfferingTypeCodesForStage(stage)
  const stagePosterSrc = normalizeRemoteImageUrl(stage.poster_url)

  return (
    <section
      id={`stage-${stage.name}`}
      className={cn(styles.stageBlock, accent, open && styles.stageBlockOpen)}
    >
      <button
        type="button"
        className={styles.stageHeader}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className={styles.stageHeaderMain}>
          <div className={styles.stageNum}>{String(index + 1).padStart(2, "0")}</div>
          {stagePosterSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={stagePosterSrc}
              alt=""
              className={styles.stagePoster}
            />
          ) : (
            <div className={styles.stageIcon} aria-hidden>
              {stageJumpIcon(stage.name)}
            </div>
          )}
          <div>
            <h2 className={styles.stageTitle}>{stage.display_name || stage.name}</h2>
            {stage.description ? (
              <p className={styles.stageDesc}>{stage.description}</p>
            ) : null}
          </div>
        </div>
        <div className={styles.stageMeta}>
          {offeringTypeCodes.length > 0 ? (
            <span className={styles.stageTypeIcons}>
              <OfferingTypeIconGroup codes={offeringTypeCodes} />
            </span>
          ) : null}
          <span className={styles.stageCount}>
            {seriesCount} Series · {offeringCount} Offering{offeringCount !== 1 ? "s" : ""}
          </span>
          <span className={styles.stageArrow} aria-hidden>
            ▾
          </span>
        </div>
      </button>

      <div className={styles.stageContent}>
        <div className={styles.stageContentInner}>
          <div className={styles.stageInner}>
            <div className={styles.seriesGrid}>
              {stage.series.map((series) => (
                <ProgramsSeriesCard key={series.name} series={series} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
