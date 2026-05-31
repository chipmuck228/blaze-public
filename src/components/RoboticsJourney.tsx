'use client'

import { ArrowRight, Zap, Target, Users } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { MarketingHeroBackdrop } from "@/components/MarketingHeroBackdrop"
import {
  HOME_HERO_SECTION_BG,
  HOME_HERO_SECTION_GRADIENT_OVERLAY,
} from "@/lib/home-section-styles"

interface JourneyStep {
  id: number
  title: string
  description: string
  ctaText: string
  ctaLink: string
  icon: React.ReactNode
  badge?: string
}

const journeySteps: JourneyStep[] = [
  {
    id: 1,
    title: "Explore",
    description:
      "Beginner level for ages 8–12. Spark interest in robotics through camps and VEX IQ—build foundational skills and hands-on confidence with game-style learning.",
    ctaText: "Learn More",
    ctaLink: "/journey/explore",
    icon: <Zap className="w-8 h-8" strokeWidth={1.25} />,
    badge: "Start Here",
  },
  {
    id: 2,
    title: "Learn",
    description:
      "Intermediate to advanced, ages 12–18. Develop core robotics skills in structured courses—programming, control, sensors, and automation—and prepare for competition or career paths.",
    ctaText: "Learn More",
    ctaLink: "/journey/learn",
    icon: <Target className="w-8 h-8" strokeWidth={1.25} />,
  },
  {
    id: 3,
    title: "Compete & Innovate",
    description:
      "Competition and innovation tracks: join a team, build competition-ready robots, and compete in local and global VEX events—or explore AI, IoT, and automation in our Innovation Lab.",
    ctaText: "Learn More",
    ctaLink: "/journey/compete",
    icon: <Users className="w-8 h-8" strokeWidth={1.25} />,
  },
]

type JourneyTheme = "light" | "dark"

const stepIconClass: Record<JourneyTheme, string[]> = {
  light: ["text-sky-500", "text-[#2563eb]", "text-indigo-600"],
  dark: ["text-sky-400", "text-blue-400", "text-cyan-300"],
}

export function RoboticsJourney({ theme = "light" }: { theme?: JourneyTheme }) {
  const isDark = theme === "dark"

  return (
    <section
      id="journey"
      className={cn(
        "py-16 sm:py-20 lg:py-24 relative overflow-hidden",
        isDark ? HOME_HERO_SECTION_BG : "bg-white dark:bg-slate-900"
      )}
    >
      {isDark ? (
        <>
          <div className={HOME_HERO_SECTION_GRADIENT_OVERLAY} aria-hidden />
          <MarketingHeroBackdrop />
        </>
      ) : null}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12 sm:mb-16">
          {isDark ? (
            <span className="text-sky-400 font-bold tracking-widest uppercase text-xs sm:text-sm">
              Your Pathway
            </span>
          ) : null}
          <h2
            className={cn(
              "text-3xl md:text-5xl font-bold tracking-tight mt-2 mb-4",
              isDark ? "text-white" : "text-[#0f172a] dark:text-white"
            )}
          >
            The Robotics Journey
          </h2>
          <p
            className={cn(
              "max-w-2xl mx-auto text-base sm:text-lg leading-relaxed",
              isDark ? "text-slate-400" : "text-slate-500 dark:text-slate-400"
            )}
          >
            Your pathway from curiosity to professional engineering starts here.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 relative">
          <div
            className={cn(
              "hidden md:block absolute top-[4.5rem] left-[12%] right-[12%] h-px z-0",
              isDark ? "bg-gradient-to-r from-transparent via-slate-600 to-transparent" : "bg-gradient-to-r from-transparent via-slate-200 to-transparent"
            )}
            aria-hidden
          />

          {journeySteps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "p-8 sm:p-10 rounded-3xl relative z-10 border transition-all duration-300 group",
                isDark
                  ? "bg-slate-800/40 border-slate-700/80 hover:border-slate-600 hover:bg-slate-800/60 backdrop-blur-sm"
                  : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-xl hover:border-slate-300"
              )}
            >
              {step.badge ? (
                <span
                  className={cn(
                    "inline-block text-[10px] font-bold uppercase tracking-wider mb-4 px-2.5 py-1 rounded-full",
                    isDark
                      ? "bg-sky-500/15 text-sky-300 border border-sky-500/25"
                      : "bg-sky-100 text-sky-700 border border-sky-200"
                  )}
                >
                  {step.badge}
                </span>
              ) : (
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider mb-4 text-transparent select-none">
                  —
                </span>
              )}
              <div
                className={cn(
                  "flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-105",
                  stepIconClass[theme][index]
                )}
              >
                {step.icon}
              </div>
              <h3
                className={cn(
                  "text-xl sm:text-2xl font-bold mb-3",
                  isDark ? "text-white" : "text-[#0f172a] dark:text-white"
                )}
              >
                {step.title}
              </h3>
              <p
                className={cn(
                  "mb-6 text-sm sm:text-base leading-relaxed",
                  isDark ? "text-slate-400" : "text-slate-500 dark:text-slate-400"
                )}
              >
                {step.description}
              </p>
              <Link
                href={step.ctaLink}
                className={cn(
                  "font-bold inline-flex items-center gap-2 transition-transform hover:translate-x-1",
                  isDark ? "text-sky-400 hover:text-sky-300" : "text-[#2563eb] dark:text-blue-400"
                )}
              >
                {step.ctaText}
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
