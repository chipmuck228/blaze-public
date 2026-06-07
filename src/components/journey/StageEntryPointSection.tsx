"use client"

import { useSearchParams } from "next/navigation"
import type { StageJourneyConfig } from "@/lib/stage-journey-config"
import { StageSeriesCatalog } from "@/components/journey/StageSeriesCatalog"
import { StaticEntryPointCards } from "@/components/journey/StaticEntryPointCards"
import styles from "@/app/journey/stage-journey.module.css"

interface StageEntryPointSectionProps {
  config: StageJourneyConfig
  condensedFont?: string
}

export function StageEntryPointSection({ config, condensedFont }: StageEntryPointSectionProps) {
  const searchParams = useSearchParams()
  const locationCode = searchParams.get("location")?.trim().toLowerCase() || null

  const lead = locationCode
    ? `Seasons and activities available for ${config.stageDisplayName}. Schedules and enrollment vary by campus.`
    : config.staticEntryLead

  return (
    <section className={`${styles.sec} ${styles.bgOff}`}>
      <div className={styles.lbl} style={condensedFont ? { fontFamily: condensedFont } : undefined}>
        Three Ways to Begin
      </div>
      <h2 className={styles.h2} style={condensedFont ? { fontFamily: condensedFont } : undefined}>
        Pick Your
        <br />
        Entry Point.
      </h2>
      <p className={styles.lead}>{lead}</p>
      {!locationCode && config.staticEntryHint ? (
        <p className={`${styles.lead} text-sm mt-2 opacity-80`}>{config.staticEntryHint}</p>
      ) : null}
      {locationCode ? (
        <StageSeriesCatalog
          campusCode={locationCode}
          stageName={config.stageName}
          stageDisplayName={config.stageDisplayName}
          className={styles.egrid}
        />
      ) : (
        <StaticEntryPointCards cards={config.staticEntryCards} condensedFont={condensedFont} />
      )}
    </section>
  )
}
