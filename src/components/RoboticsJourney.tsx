'use client'

import { ArrowRight, Zap, Target, Users } from "lucide-react"
import Link from "next/link"

interface JourneyStep {
  id: number
  title: string
  description: string
  ctaText: string
  ctaLink: string
  icon: React.ReactNode
  gradientFrom: string
  gradientTo: string
  badge?: string
}

// Step descriptions aligned with v2_category design (Beginner / Intermediate / Advanced / Competition / Innovation)
const journeySteps: JourneyStep[] = [
  {
    id: 1,
    title: "Explore",
    description: "Beginner level for ages 8–12. Spark interest in robotics through camps and VEX IQ—build foundational skills and hands-on confidence with game-style learning.",
    ctaText: "Learn More",
    ctaLink: "/journey/explore",
    icon: <Zap className="w-8 h-8" strokeWidth={1} />,
    gradientFrom: "#0f172a",
    gradientTo: "#0f172a",
    badge: "Start Here"
  },
  {
    id: 2,
    title: "Learn",
    description: "Intermediate to advanced, ages 12–18. Develop core robotics skills in structured courses—programming, control, sensors, and automation—and prepare for competition or career paths.",
    ctaText: "Learn More",
    ctaLink: "/journey/learn",
    icon: <Target className="w-8 h-8" strokeWidth={1} />,
    gradientFrom: "#2563eb",
    gradientTo: "#2563eb"
  },
  {
    id: 3,
    title: "Compete & Innovate",
    description: "Competition and innovation tracks: join a team, build competition-ready robots, and compete in local and global VEX events—or explore AI, IoT, and automation in our Innovation Lab.",
    ctaText: "Learn More",
    ctaLink: "/journey/compete",
    icon: <Users className="w-8 h-8" strokeWidth={1} />,
    gradientFrom: "#e0f2fe",
    gradientTo: "#e0f2fe"
  }
]

export const RoboticsJourney = () => {
  return (
    <section
      id="journey"
      className="py-16 sm:py-20 lg:py-24 bg-white dark:bg-slate-900"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-[#0f172a] dark:text-white mb-4 tracking-tight">The Robotics Journey</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg">Your pathway from curiosity to professional engineering starts here.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connection Line (Desktop) */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 z-0"></div>
          
          {journeySteps.map((step, index) => {
            const iconTextClass =
              index === 0
                ? 'text-[#38bdf8] dark:text-sky-400'
                : index === 1
                  ? 'text-[#2563eb] dark:text-blue-400'
                  : 'text-[#0f172a] dark:text-blue-300'

            return (
              <div 
                key={step.id}
                className="bg-slate-50 dark:bg-slate-800 p-10 rounded-3xl relative z-10 border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all group"
              >
                <div className={`w-16 h-16 bg-transparent rounded-2xl flex items-center justify-center ${iconTextClass} mb-6 group-hover:scale-110 transition-transform`}>
                  {step.icon}
                </div>
                <h3 className="text-2xl font-bold text-[#0f172a] dark:text-white mb-3">{step.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">{step.description}</p>
                <Link 
                  href={step.ctaLink} 
                  className="text-[#2563eb] dark:text-blue-400 font-bold flex items-center hover:translate-x-2 transition-transform"
                >
                  Explore <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            )
          })}
        </div>
      </div>

    </section>
  )
}
