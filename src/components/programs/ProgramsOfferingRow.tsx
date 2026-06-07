"use client"

import type { ProgramsCatalogOffering } from "@/lib/programs-catalog-tree"
import {
  OfferingTypeIcon,
  offeringTypeLabel,
} from "@/components/programs/SessionCatalogMetaIcons"
import styles from "@/app/programs/programs.module.css"

interface ProgramsOfferingRowProps {
  offering: ProgramsCatalogOffering
}

function buildMetaLine(offering: ProgramsCatalogOffering): string | null {
  const parts: string[] = []
  if (offering.target_audience?.trim()) {
    parts.push(offering.target_audience.trim())
  }
  return parts.length > 0 ? parts.join(" · ") : null
}

export function ProgramsOfferingRow({ offering }: ProgramsOfferingRowProps) {
  const meta = buildMetaLine(offering)
  const typeCode = offering.offering_type?.code
  const typeName = offering.offering_type?.name || offeringTypeLabel(typeCode)

  return (
    <div className={styles.offeringRow}>
      <div className={styles.offeringInfo}>
        <div className={styles.offeringNameRow}>
          {typeCode ? (
            <span className={styles.offeringTypeBadge} title={typeName}>
              <OfferingTypeIcon code={typeCode} />
              <span className={styles.offeringTypeLabel}>{typeName}</span>
            </span>
          ) : null}
          <div className={styles.offeringName}>{offering.name}</div>
        </div>
        {meta ? <div className={styles.offeringMeta}>{meta}</div> : null}
      </div>
      <button type="button" className={styles.viewSessionsBtn} disabled aria-disabled="true">
        View Sessions →
      </button>
    </div>
  )
}
