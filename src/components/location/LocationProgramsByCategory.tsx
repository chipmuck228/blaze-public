"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Star } from "lucide-react"
import type { LocationHeroProgram } from "@/components/location/LocationHero"

export type CategoryGroup = {
  category: {
    id: string
    name: string
    display_name: string
    description?: string | null
    poster_url?: string | null
    display_order?: number | null
  }
  programs: LocationHeroProgram[]
}

interface LocationProgramsByCategoryProps {
  programsGroupedByCategory: CategoryGroup[]
  franchiseCode: string
  locationName: string
}

export function LocationProgramsByCategory({
  programsGroupedByCategory,
  franchiseCode,
  locationName,
}: LocationProgramsByCategoryProps) {
  const programsHref = `/programs?location=${encodeURIComponent(franchiseCode)}`

  if (programsGroupedByCategory.length === 0) {
    return (
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12 text-slate-400">
            <p className="text-sm">No programs available at this location yet.</p>
            <Link
              href={programsHref}
              className="mt-4 inline-flex items-center gap-2 text-[#2563eb] hover:underline"
            >
              View all locations
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 sm:py-20 lg:py-24" id="programs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white dark:text-slate-100">
            Explore by interest
          </h2>
          <p className="text-slate-300 dark:text-slate-400 mt-1">
            Programs at {locationName}, grouped by what fits your child.
          </p>
          <Link
            href={programsHref}
            className="mt-4 inline-flex items-center gap-2 bg-[#2563eb] text-white px-5 py-2.5 rounded-full font-semibold hover:bg-blue-600 transition-colors w-fit"
          >
            View All Programs
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* 大屏：水平横向滚动；小屏：垂直堆叠 */}
        <div className="flex flex-col gap-14 lg:flex-row lg:overflow-x-auto lg:gap-8 lg:pb-4 lg:snap-x lg:snap-mandatory scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {programsGroupedByCategory.map((group) => (
            <div
              key={group.category.id}
              className="lg:min-w-[360px] lg:w-[360px] lg:shrink-0 lg:snap-start"
            >
              <div className="mb-6">
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-white dark:text-slate-100">
                    {group.category.display_name}
                  </h3>
                  {group.category.description ? (
                    <p className="text-slate-300 dark:text-slate-400 text-sm mt-1 max-w-2xl lg:max-w-none">
                      {group.category.description}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* 大屏：单列垂直；小屏：2 列网格 */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-4">
                {group.programs.map((program) => {
                  const posterUrl =
                    program.poster_url ||
                    `https://picsum.photos/400/300?random=${program.id}`
                  const isFeatured = program.featured

                  return (
                    <Link
                      key={program.id}
                      href={programsHref}
                      className={`rounded-2xl overflow-hidden shadow-lg transition-all duration-300 flex flex-col h-full group hover:shadow-xl hover:-translate-y-1 ${
                        isFeatured
                          ? "ring-2 ring-amber-400/80 bg-gradient-to-b from-amber-50/30 to-slate-900/50"
                          : "bg-slate-800/50 border border-white/5"
                      }`}
                    >
                      <div className="relative h-40 shrink-0 overflow-hidden">
                        <Image
                          src={posterUrl}
                          alt={program.display_name || program.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 1024px) 50vw, 360px"
                        />
                        {isFeatured && (
                          <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-amber-400 text-slate-900 px-2 py-0.5 rounded-full text-xs font-bold">
                            <Star className="h-3 w-3 fill-current" />
                            Featured
                          </span>
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-grow">
                        <h4 className="font-bold text-white group-hover:text-blue-300 transition-colors line-clamp-2">
                          {program.display_name || program.name}
                        </h4>
                        <p className="text-slate-400 text-sm mt-1 line-clamp-2 flex-grow">
                          {program.description ||
                            `Explore ${program.display_name || program.name}.`}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-slate-500">
                            View schedule
                          </span>
                          <ArrowRight className="h-4 w-4 text-[#38bdf8] group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12">
          <Link
            href={programsHref}
            className="inline-flex items-center gap-2 bg-[#2563eb] text-white px-5 py-2.5 rounded-full font-semibold hover:bg-blue-600 transition-colors w-fit"
          >
            View All Programs
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
