"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Calendar, Loader2, Star } from "lucide-react"
import { RichTextDisplay } from "@/components/RichTextDisplay"
import { formatCalendarDate } from "@/lib/format-calendar-date"
import { normalizeRemoteImageUrl } from "@/lib/normalize-image-url"
import styles from "@/app/journey/stage-journey.module.css"

export interface StageSeriesItem {
  id: string
  name: string
  display_name: string
  description?: string | null
  start_date: string
  end_date: string
  display_order: number
  featured?: boolean
  poster_url?: string | null
}

interface StageSeriesCatalogProps {
  campusCode: string
  stageName: string
  stageDisplayName: string
  className?: string
}

export function StageSeriesCatalog({
  campusCode,
  stageName,
  stageDisplayName,
  className = "",
}: StageSeriesCatalogProps) {
  const [series, setSeries] = useState<StageSeriesItem[]>([])
  const [campusName, setCampusName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ campus: campusCode, stage: stageName })
        const res = await fetch(`/api/public/series?${params.toString()}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || "Failed to load programs")
        }
        const data = await res.json()
        if (cancelled) return
        setSeries(data.series || [])
        setCampusName(data.campus?.name ?? campusCode)
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load programs")
          setSeries([])
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [campusCode, stageName])

  if (isLoading) {
    return (
      <div className={styles.seriesLoading}>
        <Loader2 className="h-8 w-8 animate-spin text-[#1a3fa8]" aria-hidden />
        <span className="sr-only">Loading programs…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.seriesEmpty} role="alert">
        <p>We couldn&apos;t load programs for this campus. Try again or view all programs.</p>
        <Link href={`/programs?location=${encodeURIComponent(campusCode)}`} className={`${styles.btn} ${styles.btnBlue} mt-4`}>
          View All Programs
        </Link>
      </div>
    )
  }

  if (series.length === 0) {
    return (
      <div className={styles.seriesEmpty}>
        <p>
          No {stageDisplayName} programs are listed at {campusName ?? campusCode} yet. Check back soon or browse all programs.
        </p>
        <Link href={`/programs?location=${encodeURIComponent(campusCode)}`} className={`${styles.btn} ${styles.btnBlue} mt-4`}>
          Browse Programs
        </Link>
      </div>
    )
  }

  return (
    <div className={className || styles.seriesGrid}>
      {series.map((item, index) => {
        const posterSrc = normalizeRemoteImageUrl(item.poster_url)
        const dateRange =
          item.start_date && item.end_date
            ? `${formatCalendarDate(item.start_date)} – ${formatCalendarDate(item.end_date)}`
            : null

        return (
          <article
            key={item.id}
            className={`${styles.seriesCard} ${item.featured ? styles.seriesCardFeatured : ""}`}
          >
            <div
              className={`${styles.seriesCardHead} ${
                index % 3 === 0 ? styles.seriesToneBlue : index % 3 === 1 ? styles.seriesToneGold : styles.seriesToneGreen
              }`}
            >
              {posterSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={posterSrc} alt="" className={styles.seriesPoster} />
              ) : (
                <div className={styles.seriesPosterPlaceholder} aria-hidden>
                  <span className={styles.seriesPosterEmoji}>
                    {index % 3 === 0 ? "🎟️" : index % 3 === 1 ? "🔑" : "🏕️"}
                  </span>
                </div>
              )}
              <div className={styles.seriesCardHeadText}>
                {item.featured && (
                  <span className={styles.seriesFeaturedBadge}>
                    <Star className="h-3 w-3 fill-current" aria-hidden />
                    Featured
                  </span>
                )}
                <h3 className={styles.seriesTitle}>{item.display_name}</h3>
                {item.name !== item.display_name && (
                  <p className={styles.seriesSlug}>{item.name}</p>
                )}
              </div>
            </div>
            <div className={styles.seriesCardBody}>
              {dateRange && (
                <p className={styles.seriesDates}>
                  <Calendar className="h-4 w-4 shrink-0" aria-hidden />
                  {dateRange}
                </p>
              )}
              {item.description && (
                <RichTextDisplay content={item.description} className={styles.seriesDesc} preserveFormatting />
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
