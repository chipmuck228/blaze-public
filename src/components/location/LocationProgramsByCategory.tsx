"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { buildProgramsPageHref } from "@/lib/programs-catalog-view"

export type LocationProgram = {
  id: string
  name: string
  display_name: string
  description: string | null
  poster_url: string | null
  featured: boolean
  session_count: number
  category: { id: string; name: string; display_name: string } | null
}

export type CategoryGroup = {
  category: {
    id: string
    name: string
    display_name: string
    description?: string | null
    poster_url?: string | null
    display_order?: number | null
  }
  programs: LocationProgram[]
}

interface LocationProgramsByCategoryProps {
  programsGroupedByCategory: CategoryGroup[]
  franchiseCode: string
  locationName: string
}

function journeyHrefForProgram(categoryName: string): string {
  const code = (categoryName || "").toLowerCase()
  return `/journey/${encodeURIComponent(code)}`
}

function sessionCountLabel(count: number): string {
  return count === 1 ? "1 Session" : `${count} Sessions`
}

function activitySessionBadgeLabel(count: number): string {
  if (count === 0) return "Coming Soon"
  return sessionCountLabel(count)
}

function normalizeActivityText(value: string): string {
  return value.toLowerCase().replace(/[_\s-]+/g, " ").trim()
}

/** C-end Activity title: display_name only; humanize DB name if display_name is empty. */
function getActivityTitle(program: LocationProgram): string {
  const displayName = program.display_name?.trim()
  if (displayName) return displayName
  return humanizeActivityName(program.name)
}

function humanizeActivityName(name: string): string {
  return (name || "")
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

/** Omit description when it repeats the title or exposes raw activity name. */
function getActivityDescription(program: LocationProgram, title: string): string | null {
  const description = program.description?.trim()
  if (!description) return null

  const normalizedTitle = normalizeActivityText(title)
  const normalizedDescription = normalizeActivityText(description)
  const normalizedName = normalizeActivityText(program.name)

  if (normalizedDescription === normalizedTitle) return null
  if (normalizedDescription === normalizedName) return null

  return description
}

function LocationHeader({
  locationName,
  programsHref,
}: {
  locationName: string
  programsHref: string
}) {
  return (
    <header className="mb-10 md:mb-12" aria-label={locationName}>
      <div className="flex items-center gap-3 sm:gap-5">
        <div className="flex-1 border-t border-slate-300 dark:border-slate-600" />
        <h2 className="shrink-0 font-montserrat text-5xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight text-slate-900 dark:text-white px-2 sm:px-4">
          {locationName}
        </h2>
        <div className="flex-1 border-t border-slate-300 dark:border-slate-600" />
      </div>
      <div className="mt-8 flex justify-center">
        <Link
          href={programsHref}
          className="inline-flex items-center gap-2 bg-[#2563eb] text-white px-6 py-3 rounded-full font-semibold text-base hover:bg-blue-600 transition-colors shadow-md"
        >
          View All Programs
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </header>
  )
}

export function LocationProgramsByCategory({
  programsGroupedByCategory,
  franchiseCode,
  locationName,
}: LocationProgramsByCategoryProps) {
  const programsHref = buildProgramsPageHref({ locationCode: franchiseCode })

  return (
    <section className="py-16 sm:py-20 lg:py-24" id="programs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <LocationHeader locationName={locationName} programsHref={programsHref} />

        {programsGroupedByCategory.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 text-sm py-8">
            Programs at this campus are coming soon.
          </p>
        ) : (
          <div
            className="flex flex-col gap-14 lg:flex-row lg:overflow-x-auto lg:gap-8 lg:pb-4 lg:snap-x lg:snap-mandatory scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {programsGroupedByCategory.map((group) => (
              <div
                key={group.category.id}
                className="lg:min-w-[360px] lg:w-[360px] lg:shrink-0 lg:snap-start"
              >
                <div className="mb-6">
                  <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
                    <Link
                      href={journeyHrefForProgram(group.category.name)}
                      className="hover:text-[#2563eb] dark:hover:text-blue-400 transition-colors"
                    >
                      {group.category.display_name}
                    </Link>
                  </h3>
                  {group.category.description ? (
                    <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 max-w-2xl lg:max-w-none">
                      {group.category.description}
                    </p>
                  ) : null}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-4">
                  {group.programs.map((program) => {
                      const posterUrl =
                        program.poster_url ||
                        `https://picsum.photos/400/300?random=${program.id}`
                      const isFeatured = program.featured
                      const activityTitle = getActivityTitle(program)
                      const activityDescription = getActivityDescription(program, activityTitle)

                      return (
                        <Link
                          key={program.id}
                          href={programsHref}
                          className={`rounded-2xl overflow-hidden shadow-lg transition-all duration-300 flex flex-col h-full group hover:shadow-xl hover:-translate-y-1 ${
                            isFeatured
                              ? "ring-2 ring-amber-400/80 bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-800/50"
                              : "bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/5"
                          }`}
                        >
                          <div className="relative h-40 shrink-0 overflow-hidden">
                            <Image
                              src={posterUrl}
                              alt={activityTitle}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              sizes="(max-width: 1024px) 50vw, 360px"
                              loading="lazy"
                            />
                            {isFeatured && (
                              <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full text-xs font-bold">
                                <Star className="h-3 w-3 fill-current" />
                                Featured
                              </span>
                            )}
                            <Badge
                              variant={program.session_count === 0 ? "outline" : "secondary"}
                              className={
                                program.session_count === 0
                                  ? "absolute top-2 right-2 bg-white/95 text-slate-600 border-slate-300/80 shadow-sm text-xs font-semibold"
                                  : "absolute top-2 right-2 bg-white/95 text-slate-800 border-slate-200/80 shadow-sm text-xs font-semibold"
                              }
                            >
                              {activitySessionBadgeLabel(program.session_count)}
                            </Badge>
                          </div>
                          <div className="p-4 flex flex-col flex-grow">
                            <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors line-clamp-2">
                              {activityTitle}
                            </h4>
                            {activityDescription ? (
                              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 line-clamp-3 flex-grow">
                                {activityDescription}
                              </p>
                            ) : null}
                            <div className={`flex items-center justify-between ${activityDescription ? "mt-3" : "mt-auto pt-3"}`}>
                              <span className="text-xs text-slate-500">View schedule</span>
                              <ArrowRight className="h-4 w-4 text-[#2563eb] group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
