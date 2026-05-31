'use client'

import { Sparkles, Hand, GraduationCap, Users, Trophy, Award } from "lucide-react"
import { cn } from "@/lib/utils"

interface Feature {
  icon: React.ReactNode
  title: string
  desc: string
}

interface Stat {
  value: string
  label: string
}

const features: Feature[] = [
  {
    icon: <Sparkles className="w-7 h-7" strokeWidth={1.25} />,
    title: "Sparking STEM Curiosity",
    desc: "Blaze Robotics Academy stands out with a 6000 sq ft Robot House for all ages, from elementary to high school enthusiasts. Our camps ignite a passion for STEM, blending education with excitement.",
  },
  {
    icon: <Hand className="w-7 h-7" strokeWidth={1.25} />,
    title: "Hands-On Experience",
    desc: "We emphasize the importance of hands-on, interactive learning. Our camps are packed with practical activities, from building and programming robots to designing and creating 3D printed projects.",
  },
  {
    icon: <GraduationCap className="w-7 h-7" strokeWidth={1.25} />,
    title: "Expert Guidance",
    desc: "Our instructors are more than teachers; they're mentors from competition team coaches and robotics enthusiasts with extensive experience in building robots.",
  },
  {
    icon: <Users className="w-7 h-7" strokeWidth={1.25} />,
    title: "Building 21st Century Skills",
    desc: "In today's rapidly evolving world, skills such as collaboration, communication, critical thinking, and creativity (the 4Cs) are indispensable.",
  },
  {
    icon: <Award className="w-7 h-7" strokeWidth={1.25} />,
    title: "Showcase and Recognition",
    desc: "Every camper's hard work and creativity are celebrated. Our end-of-camp showcases allow students to present their projects, fostering a sense of accomplishment.",
  },
  {
    icon: <Trophy className="w-7 h-7" strokeWidth={1.25} />,
    title: "Pathway to Compete",
    desc: "Join Blaze camps as a gateway to our competitive teams, where passionate campers advance to compete in robotics challenges globally.",
  },
]

const stats: Stat[] = [
  { value: "9", label: "Years of Experience" },
  { value: "78", label: "Awards Won" },
  { value: "19+", label: "Active Teams" },
  { value: "25", label: "World Qualifiers" },
]

type AdvantagesTheme = "light" | "dark"

export function Advantages({ theme = "dark" }: { theme?: AdvantagesTheme }) {
  const isDark = theme === "dark"

  return (
    <section
      id="advantages"
      className={cn(
        "py-16 sm:py-20 lg:py-24 relative overflow-hidden",
        isDark ? "bg-[#0f172a]" : "bg-slate-50"
      )}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {isDark ? (
          <>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sky-600/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
          </>
        ) : (
          <>
            <div className="absolute top-1/4 right-0 w-[420px] h-[420px] bg-blue-400/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[320px] h-[320px] bg-sky-300/10 rounded-full blur-3xl -translate-x-1/4" />
          </>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12 sm:mb-16">
          <span
            className={cn(
              "font-bold tracking-widest uppercase text-xs sm:text-sm",
              isDark ? "text-[#38bdf8]" : "text-[#2563eb]"
            )}
          >
            The Blaze Difference
          </span>
          <h2
            className={cn(
              "text-3xl md:text-5xl font-bold mt-2 mb-4 sm:mb-6 tracking-tight",
              isDark ? "text-white" : "text-[#0f172a]"
            )}
          >
            Why Choose Blaze Robotics?
          </h2>
          <p
            className={cn(
              "text-base sm:text-lg max-w-2xl mx-auto leading-relaxed",
              isDark ? "text-slate-400" : "text-slate-600"
            )}
          >
            We don&apos;t just teach robotics; we forge future engineers through a rigorous, hands-on
            curriculum and a culture of excellence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-16 sm:mb-20">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className={cn(
                "p-7 sm:p-8 rounded-3xl border transition-all duration-300",
                isDark
                  ? "bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 backdrop-blur-sm"
                  : "bg-white border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300"
              )}
            >
              <div
                className={cn(
                  "mb-5 flex items-center justify-start",
                  isDark ? "text-sky-400" : "text-[#2563eb]"
                )}
              >
                {feature.icon}
              </div>
              <h3
                className={cn(
                  "text-lg sm:text-xl font-bold mb-3",
                  isDark ? "text-white" : "text-[#0f172a]"
                )}
              >
                {feature.title}
              </h3>
              <p
                className={cn(
                  "text-sm sm:text-base leading-relaxed",
                  isDark ? "text-slate-400" : "text-slate-600"
                )}
              >
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        <div
          className={cn(
            "grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 pt-12 sm:pt-16 border-t",
            isDark ? "border-slate-800" : "border-slate-200"
          )}
        >
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center px-2">
              <div
                className={cn(
                  "text-3xl sm:text-4xl md:text-5xl font-extrabold mb-1 sm:mb-2 tabular-nums",
                  isDark ? "text-[#38bdf8]" : "text-[#2563eb]"
                )}
              >
                {stat.value}
              </div>
              <div
                className={cn(
                  "text-[10px] sm:text-xs uppercase tracking-widest font-bold",
                  isDark ? "text-slate-500" : "text-slate-500"
                )}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
