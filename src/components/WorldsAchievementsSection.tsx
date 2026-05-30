"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Award,
  Medal,
  Sparkles,
  Trophy,
} from "lucide-react"
import {
  WORLDS_ACHIEVEMENTS_2026,
  WORLDS_ACHIEVEMENTS_BACKGROUND,
  WORLDS_ACHIEVEMENTS_BACKGROUND_JPG,
} from "@/lib/worlds-achievements-2026"
import type {
  WorldsAchievementEntry,
  WorldsAchievementImage,
} from "@/lib/worlds-achievements-2026"
import { cn } from "@/lib/utils"

function formatTeams(teams: string | readonly string[]): string {
  return typeof teams === "string" ? teams : teams.join(" · ")
}

const variantStyles: Record<
  WorldsAchievementEntry["variant"],
  { icon: typeof Trophy; accent: string; border: string }
> = {
  champion: {
    icon: Trophy,
    accent: "text-amber-300",
    border: "border-amber-400/40 bg-amber-500/10",
  },
  finals: {
    icon: Medal,
    accent: "text-[#38bdf8]",
    border: "border-[#38bdf8]/30 bg-white/5",
  },
  playoff: {
    icon: Sparkles,
    accent: "text-slate-200",
    border: "border-white/15 bg-white/5",
  },
  award: {
    icon: Award,
    accent: "text-[#38bdf8]",
    border: "border-[#38bdf8]/30 bg-white/5",
  },
  elimination: {
    icon: Medal,
    accent: "text-slate-300",
    border: "border-white/10 bg-white/[0.03]",
  },
}

function AchievementImage({
  image,
  priority = false,
  sizes,
}: {
  image: WorldsAchievementImage
  priority?: boolean
  sizes: string
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-800/80 text-slate-400 border border-white/10"
        role="img"
        aria-label={image.alt}
      >
        <Trophy className="h-10 w-10 text-[#38bdf8]/60" aria-hidden />
        <span className="text-xs text-center px-4">Photo coming soon</span>
      </div>
    )
  }

  return (
    <Image
      src={image.src}
      alt={image.alt}
      fill
      className="object-cover"
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
    />
  )
}

function SectionBackground() {
  const [src, setSrc] = useState(WORLDS_ACHIEVEMENTS_BACKGROUND)

  return (
    <>
      <Image
        src={src}
        alt=""
        fill
        className="object-cover object-center"
        sizes="100vw"
        priority
        aria-hidden
        onError={() => {
          if (src !== WORLDS_ACHIEVEMENTS_BACKGROUND_JPG) {
            setSrc(WORLDS_ACHIEVEMENTS_BACKGROUND_JPG)
          }
        }}
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#0f172a]/92 via-[#0f172a]/85 to-[#0f172a]/95"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-[#0f172a]/80 via-transparent to-[#0f172a]/70"
        aria-hidden
      />
    </>
  )
}

function DivisionAchievements({
  label,
  subtitle,
  teamNumbers,
  entries,
}: {
  label: string
  subtitle: string
  teamNumbers: readonly string[]
  entries: readonly WorldsAchievementEntry[]
}) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.07] backdrop-blur-md shadow-xl overflow-hidden">
      <div className="px-5 sm:px-6 py-4 border-b border-white/10">
        <h4 className="text-base sm:text-lg font-semibold text-white tracking-tight">
          {label}
        </h4>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5 tracking-wide">
          {subtitle}
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {teamNumbers.map((team) => (
            <span
              key={team}
              className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-0.5 text-xs font-semibold text-slate-100 tracking-wide"
            >
              {team}
            </span>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-white/10">
        {entries.map((entry) => {
          const style = variantStyles[entry.variant]
          const Icon = style.icon
          const teamsLabel = formatTeams(entry.teams)
          const isChampion = entry.variant === "champion"

          return (
            <li
              key={`${teamsLabel}-${entry.title}`}
              className={cn(
                "px-5 sm:px-6 py-4 flex gap-4 items-start",
                isChampion && "bg-gradient-to-r from-amber-500/10 to-transparent"
              )}
            >
              <div
                className={cn(
                  "shrink-0 h-10 w-10 rounded-xl flex items-center justify-center border",
                  style.border
                )}
              >
                <Icon className={cn("h-5 w-5", style.accent)} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span
                    className={cn(
                      "font-mono text-sm font-bold tracking-wide",
                      isChampion ? "text-amber-200" : "text-[#38bdf8]"
                    )}
                  >
                    {teamsLabel}
                  </span>
                  <span className="text-white/30 hidden sm:inline" aria-hidden>
                    —
                  </span>
                  <span className="text-sm sm:text-base font-medium text-white leading-snug">
                    {entry.title}
                  </span>
                </div>
                {entry.detail ? (
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {entry.detail}
                  </p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function WorldsAchievementsSection() {
  const data = WORLDS_ACHIEVEMENTS_2026
  const featured = data.images.find((img) => img.featured) ?? data.images[0]
  const gallery = data.images.filter((img) => img !== featured)

  return (
    <section
      className="relative border-b border-white/10 overflow-hidden min-h-0 pt-20"
      aria-labelledby="worlds-achievements-heading"
    >
      <div className="absolute inset-0 z-0">
        <SectionBackground />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 lg:py-20">
        <div className="text-center mb-10 lg:mb-12">
          <p className="inline-flex items-center rounded-full bg-white/10 border border-white/20 text-slate-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider mb-4 backdrop-blur-sm">
            {data.badge}
          </p>
          <h2
            id="worlds-achievements-heading"
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight mb-4 text-balance drop-shadow-sm"
          >
            {data.headline}
          </h2>
          <p className="text-base sm:text-lg md:text-xl font-medium text-slate-200/95 max-w-3xl mx-auto leading-relaxed">
            {data.subheadline}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          <div className="space-y-5 order-2 lg:order-1">
            <DivisionAchievements
              label={data.highSchool.label}
              subtitle={data.highSchool.subtitle}
              teamNumbers={data.highSchool.teamNumbers}
              entries={data.highSchool.entries}
            />
            <DivisionAchievements
              label={data.middleSchool.label}
              subtitle={data.middleSchool.subtitle}
              teamNumbers={data.middleSchool.teamNumbers}
              entries={data.middleSchool.entries}
            />
            <Link
              href={data.cta.href}
              className="inline-flex items-center gap-2 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold px-8 py-3.5 text-sm sm:text-base shadow-lg shadow-blue-900/40 hover:-translate-y-0.5 transition-all"
            >
              {data.cta.label}
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          <div className="space-y-4 order-1 lg:order-2">
            <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden border border-white/20 shadow-2xl ring-1 ring-white/10">
              <AchievementImage
                image={featured}
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            {gallery.length > 0 && (
              <div
                className={cn(
                  "grid gap-4",
                  gallery.length >= 2 ? "grid-cols-2" : "grid-cols-1"
                )}
              >
                {gallery.map((image) => (
                  <div
                    key={image.src}
                    className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/15 shadow-lg"
                  >
                    <AchievementImage
                      image={image}
                      sizes="(max-width: 1024px) 50vw, 25vw"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
