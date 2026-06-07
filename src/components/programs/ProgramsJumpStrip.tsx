"use client"

import type { ProgramsCatalogStage } from "@/lib/programs-catalog-tree"
import { stageJumpIcon } from "@/lib/programs-catalog-tree"
import styles from "@/app/programs/programs.module.css"

interface ProgramsJumpStripProps {
  stages: ProgramsCatalogStage[]
}

export function ProgramsJumpStrip({ stages }: ProgramsJumpStripProps) {
  if (stages.length === 0) return null

  return (
    <div className={styles.jumpStrip}>
      <div className={styles.jumpRow}>
        <span className={styles.jumpLabel}>Jump to:</span>
        {stages.map((stage) => (
          <a
            key={stage.id}
            href={`#stage-${stage.name}`}
            className={styles.jumpBtn}
          >
            <span aria-hidden>{stageJumpIcon(stage.name)}</span>
            {stage.display_name || stage.name}
          </a>
        ))}
      </div>
    </div>
  )
}
