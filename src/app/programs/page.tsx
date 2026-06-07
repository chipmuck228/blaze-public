'use client'

import { getErrorMessage } from "@/lib/typed-error"
import { useState, useEffect, useCallback, useMemo, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"
import { ProgramsCatalogHero } from "@/components/programs/ProgramsCatalogHero"
import { ProgramsJumpStrip } from "@/components/programs/ProgramsJumpStrip"
import {
  hasActiveProgramsCatalogFilters,
  ProgramsCatalogFilters,
} from "@/components/programs/ProgramsCatalogFilters"
import { ProgramsStageSection } from "@/components/programs/ProgramsStageSection"
import { OpenProgramsAIChatButton } from "@/components/programs-ai/OpenProgramsAIChatButton"
import { PROGRAMS_AI_ASSISTANT_ENABLED } from "@/lib/programs-ai-config"
import {
  collectCatalogOfferingTypes,
  filterProgramsCatalogStages,
  type ProgramsCatalogFilterState,
  type ProgramsCatalogResponse,
} from "@/lib/programs-catalog-tree"
import styles from "@/app/programs/programs.module.css"

const EMPTY_STATS: ProgramsCatalogResponse["stats"] = {
  stages: 0,
  series: 0,
  offerings: 0,
  locations: 0,
}

function ProgramsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const campusCodeFromUrl = (
    searchParams.get("location") || searchParams.get("franchise") || searchParams.get("campus")
  )?.trim().toLowerCase() ?? null

  const [catalog, setCatalog] = useState<ProgramsCatalogResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ProgramsCatalogFilterState>({
    searchQuery: "",
    locationId: "all",
    gradeRange: "all",
    offeringTypeCode: "all",
  })

  const fetchCatalog = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (campusCodeFromUrl) {
        params.set("campus", campusCodeFromUrl)
      }
      const qs = params.toString()
      const res = await fetch(qs ? `/api/public/programs-catalog?${qs}` : "/api/public/programs-catalog")

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to load programs catalog")
      }

      const data = (await res.json()) as ProgramsCatalogResponse
      setCatalog(data)
    } catch (err) {
      console.error("[programs] Error loading catalog:", err)
      setCatalog(null)
      setError(err instanceof Error ? getErrorMessage(err) : "Failed to load programs")
    } finally {
      setIsLoading(false)
    }
  }, [campusCodeFromUrl])

  useEffect(() => {
    fetchCatalog()
  }, [fetchCatalog])

  useEffect(() => {
    setFilters({
      searchQuery: "",
      locationId: "all",
      gradeRange: "all",
      offeringTypeCode: "all",
    })
  }, [campusCodeFromUrl])

  const allStages = catalog?.stages ?? []
  const stages = useMemo(
    () => filterProgramsCatalogStages(allStages, filters),
    [allStages, filters]
  )
  const filterOfferingTypes = useMemo(
    () => collectCatalogOfferingTypes(allStages),
    [allStages]
  )

  const clearCampusFilter = () => {
    router.replace("/programs")
  }

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <Footer />
      </>
    )
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <p className="text-destructive mb-4">{error}</p>
            <button
              type="button"
              onClick={fetchCatalog}
              className="px-4 py-2 bg-[#2563eb] text-white rounded-full font-bold"
            >
              Retry
            </button>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  const stats = catalog?.stats ?? EMPTY_STATS
  const filterLocations = catalog?.filterLocations ?? []
  const campusName = catalog?.campus?.name ?? null
  const filtersActive = hasActiveProgramsCatalogFilters(filters)
  const hasCatalogData = allStages.length > 0

  return (
    <>
      <Navbar />
      <div className={styles.page}>
        <ProgramsCatalogHero campusName={campusName} stats={stats} />
        <ProgramsJumpStrip stages={stages} />

        {hasCatalogData ? (
          <ProgramsCatalogFilters
            filterLocations={filterLocations}
            filterOfferingTypes={filterOfferingTypes}
            filters={filters}
            onFiltersChange={setFilters}
          />
        ) : null}

        <section className={styles.catalog}>
          {stages.length > 0 ? (
            <div className={styles.catalogStack}>
              {stages.map((stage, index) => (
                <ProgramsStageSection
                  key={stage.id}
                  stage={stage}
                  index={index}
                  defaultOpen={index === 0}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>
                {filtersActive
                  ? "No offerings match your search or filters. Try adjusting your criteria."
                  : campusCodeFromUrl
                    ? "No programs with open sessions are listed at this campus yet."
                    : "No programs with open sessions are listed yet."}
              </p>
              {filtersActive ? (
                <button
                  type="button"
                  onClick={() =>
                    setFilters({
                      searchQuery: "",
                      locationId: "all",
                      gradeRange: "all",
                      offeringTypeCode: "all",
                    })
                  }
                  className={styles.clearBtn}
                >
                  Clear Filters
                </button>
              ) : campusCodeFromUrl ? (
                <button type="button" onClick={clearCampusFilter} className={styles.clearBtn}>
                  Browse All Programs
                </button>
              ) : null}
            </div>
          )}
        </section>

        {PROGRAMS_AI_ASSISTANT_ENABLED && (
          <section className={styles.aiSection}>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[40px] p-12 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                <div className="text-center lg:text-left">
                  <h2 className="text-4xl font-black mb-4">Unsure about your child&apos;s level?</h2>
                  <p className="text-blue-100 text-lg max-w-xl">
                    Chat with our AI assistant for personalized program recommendations by age, grade, and
                    interests.
                  </p>
                </div>
                <OpenProgramsAIChatButton>Get AI Assessment</OpenProgramsAIChatButton>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
            </div>
          </section>
        )}
      </div>
      <Footer />
    </>
  )
}

export default function ProgramsPage() {
  return (
    <Suspense
      fallback={
        <>
          <Navbar />
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <Footer />
        </>
      }
    >
      <ProgramsPageContent />
    </Suspense>
  )
}
